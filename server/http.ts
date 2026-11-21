import { z } from 'zod';
import { authFor } from './auth';
import { authenticate, membershipFor, workspace } from './workspace';
import { createInvitation, preview, accept } from './invitations';
import { runCommand } from './transaction';
import { attachmentManifest, readFile } from './files';
import {
  denied,
  Failure,
  json,
  missing,
  originOf,
  rateLimit,
  readJson,
  unauthenticated,
  type PilotEnv,
} from './common';

const allowedAuth = new Map([
  ['/api/auth/sign-in/email', 'POST'],
  ['/api/auth/sign-out', 'POST'],
  ['/api/auth/get-session', 'GET'],
  ['/api/auth/change-password', 'POST'],
]);
async function authRoute(env: PilotEnv, request: Request, path: string) {
  if (allowedAuth.get(path) !== request.method) missing();
  const auth = authFor(env);
  if (path.endsWith('/get-session')) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) unauthenticated();
    const { email, name } = await membershipFor(env, session.user.id);
    const id = session.user.id;
    return json({
      ok: true,
      user: { id, email, name },
      session: { expiresAt: session.session.expiresAt },
    });
  }
  if (!path.endsWith('/sign-out')) await rateLimit(env, request, 'auth', 12);
  const body = await readJson(request, 4096);
  let response: Response;
  if (path.endsWith('/sign-in/email')) {
    const input = z
      .strictObject({
        email: z.email().max(254),
        password: z.string().min(1).max(128),
        rememberMe: z.boolean().optional(),
      })
      .parse(body);
    response = await auth.api.signInEmail({
      body: input,
      headers: request.headers,
      asResponse: true,
    });
  } else if (path.endsWith('/change-password')) {
    await authenticate(env, request);
    const input = z
      .strictObject({
        currentPassword: z.string().min(1).max(128),
        newPassword: z.string().min(12).max(128),
        revokeOtherSessions: z.boolean().optional(),
      })
      .parse(body);
    response = await auth.api.changePassword({
      body: { ...input, revokeOtherSessions: true },
      headers: request.headers,
      asResponse: true,
    });
  } else {
    z.strictObject({}).parse(body);
    response = await auth.api.signOut({ headers: request.headers, asResponse: true });
  }
  if (!response.ok)
    throw new Failure(
      response.status,
      'AUTH_FAILED',
      'Não foi possível autenticar. Confira seus dados.',
    );
  return json({ ok: true }, 200, response.headers);
}
async function route(request: Request, env: PilotEnv) {
  const url = new URL(request.url),
    path = url.pathname;
  if (path === '/api/health' && request.method === 'GET') {
    originOf(env.APP_ORIGIN);
    if (
      !env.BETTER_AUTH_SECRET ||
      env.BETTER_AUTH_SECRET.length < 32 ||
      !env.PILOT_FILES ||
      !env.PILOT_DB
    )
      throw new Error();
    await env.PILOT_DB.prepare('SELECT id FROM pilot_workspace LIMIT 1').first();
    await env.PILOT_FILES.head('health');
    return json({ ok: true, status: 'ready' });
  }
  if (
    request.method === 'POST' &&
    (request.headers.get('origin') !== originOf(env.APP_ORIGIN) || url.origin !== env.APP_ORIGIN)
  )
    throw new Failure(403, 'ORIGIN', 'Origem da solicitação inválida.');
  if (path.startsWith('/api/auth/')) return authRoute(env, request, path);
  if (
    request.method === 'POST' &&
    (path === '/api/invitations/preview' || path === '/api/invitations/accept')
  ) {
    await rateLimit(env, request, path, 30);
    const body = await readJson(request, 4096);
    return path.endsWith('/preview') ? preview(env, body) : accept(env, request, body);
  }
  const identity = await authenticate(env, request);
  if (
    request.method === 'POST' &&
    request.headers.has('x-workspace-id') &&
    request.headers.get('x-workspace-id') !== identity.workspaceId
  )
    throw new Failure(409, 'SESSION_CHANGED', 'A conta foi alterada. Recarregue a página.');
  if (path === '/api/invitations' && request.method === 'POST')
    return createInvitation(env, identity, await readJson(request, 4096));
  if (path === '/api/commands' && request.method === 'POST')
    return json(await runCommand(env, identity, await readJson(request, 12 * 1024 * 1024)));
  if (request.method !== 'GET') missing();
  if (path === '/api/workspace' || path === '/api/session')
    return json(await workspace(env, identity));
  if (path.startsWith('/api/files/')) return readFile(env, identity.workspaceId, path);
  if (path === '/api/export') {
    if (identity.role !== 'admin') denied();
    const live = await workspace(env, identity);
    if (live.identity.role !== 'admin') denied();
    const files = attachmentManifest(live.state);
    return json(
      {
        ok: true,
        format: 'tagronda.workspace.v1',
        exportedAt: live.nowISO,
        ...(live.scheduleWarning ? { scheduleWarning: live.scheduleWarning } : {}),
        workspace: { id: identity.workspaceId, timezone: live.timezone, state: live.state },
        files,
      },
      200,
      new Headers({ 'content-disposition': 'attachment; filename="tagronda-workspace.json"' }),
    );
  }
  missing();
}
export async function handlePilot(request: Request, env: PilotEnv): Promise<Response> {
  try {
    return await route(request, env);
  } catch (e) {
    if (e instanceof z.ZodError)
      return json(
        {
          ok: false,
          code: 'INVALID_INPUT',
          error: 'Confira os campos e o formato dos dados enviados.',
        },
        400,
      );
    if (e instanceof Failure) return json({ ok: false, code: e.code, error: e.message }, e.status);
    return json(
      { ok: false, code: 'UNAVAILABLE', error: 'Serviço indisponível. Tente novamente.' },
      503,
    );
  }
}
