import { z } from 'zod';
import type { PilotIdentity } from '../src/types/pilot';
import { authFor } from './auth';
import { activeGuard } from './workspace';
import {
  conflict,
  denied,
  digest,
  Failure,
  guard,
  isGuardFailure,
  json,
  unauthenticated,
  type PilotEnv,
} from './common';
import { emailSchema, nameSchema, invitationKey } from './provision';
export const roleSchema = z.enum(['admin', 'operator', 'viewer']);
const previewInput = z.strictObject({ token: z.string().regex(/^[0-9a-f]{64}$/) });
const acceptInput = previewInput.extend({
  name: nameSchema,
  password: z.string().min(12).max(128).optional(),
});
const createInput = z.strictObject({ email: emailSchema, name: nameSchema, role: roleSchema });
interface InvitationRow {
  digest: string;
  workspace: string;
  member: string;
  email: string;
  role: 'operator' | 'admin' | 'viewer';
  name: string;
  companyName: string;
  expiresAt: string;
  accountId: string | null;
}
function expired(): never {
  throw new Failure(410, 'INVITE_EXPIRED', 'Este convite expirou ou já foi utilizado.');
}
async function lookup(env: PilotEnv, token: string) {
  const row = await env.PILOT_DB.prepare(
    `SELECT i.digest,i.workspace,i.member,i.expires AS expiresAt,m.email,m.name,m.role,u.id AS accountId,json_extract(w.company,'$.name') AS companyName
    FROM pilot_invite i JOIN pilot_member m ON m.workspace=i.workspace AND m.id=i.member JOIN pilot_workspace w ON w.id=i.workspace
    LEFT JOIN "user" u ON u.email=m.email WHERE i.digest=? AND i.used=0 AND i.expires>? AND m.userId IS NULL`,
  )
    .bind(await digest(token), new Date().toISOString())
    .first<InvitationRow>();
  return row ?? expired();
}
export async function preview(env: PilotEnv, body: unknown) {
  const { token } = previewInput.parse(body);
  const { email, name, role, companyName, expiresAt, accountId } = await lookup(env, token);
  return json({
    ok: true,
    invitation: { email, name, role, companyName, expiresAt, existingAccount: !!accountId },
  });
}
export async function createInvitation(env: PilotEnv, actor: PilotIdentity, body: unknown) {
  if (actor.role !== 'admin') denied();
  const { email, name, role } = createInput.parse(body);
  const db = env.PILOT_DB;
  const member = await db
    .prepare('SELECT id,userId FROM pilot_member WHERE workspace=? AND email=?')
    .bind(actor.workspaceId, email)
    .first<{ id: string; userId: string | null }>();
  const unavailable = 'Não foi possível emitir o convite para este endereço.';
  if (member?.userId) conflict(unavailable);
  const id = member?.id ?? crypto.randomUUID();
  const key = await invitationKey(env.APP_ORIGIN);
  try {
    await db.batch([
      activeGuard(env, actor, true),
      guard(
        db,
        'NOT EXISTS(SELECT 1 FROM pilot_member WHERE workspace=? AND email=? AND userId IS NOT NULL)',
        actor.workspaceId,
        email,
      ),
      db
        .prepare(
          `INSERT INTO pilot_member(id,workspace,email,name,role,status) VALUES(?,?,?,?,?,'inactive')
        ON CONFLICT(workspace,email) DO UPDATE SET name=excluded.name,role=excluded.role`,
        )
        .bind(id, actor.workspaceId, email, name, role),
      db
        .prepare('UPDATE pilot_invite SET used=1 WHERE workspace=? AND member=? AND used=0')
        .bind(actor.workspaceId, id),
      db
        .prepare('INSERT INTO pilot_invite(digest,workspace,member,expires) VALUES(?,?,?,?)')
        .bind(key.digest, actor.workspaceId, id, key.expiresAt),
      db
        .prepare('UPDATE pilot_workspace SET revision=? WHERE id=?')
        .bind(crypto.randomUUID(), actor.workspaceId),
    ]);
  } catch (e) {
    if (isGuardFailure(e) || /constraint/i.test(String(e))) conflict(unavailable);
    throw e;
  }
  return json({
    ok: true,
    invitationUrl: key.invitationUrl,
    expiresAt: key.expiresAt,
    memberId: id,
  });
}
export async function accept(env: PilotEnv, req: Request, body: unknown) {
  const { token, password, name } = acceptInput.parse(body);
  const row = await lookup(env, token);
  const auth = authFor(env);
  const session = await auth.api.getSession({ headers: req.headers });
  if (session && session.user.email.toLowerCase() !== row.email) denied();
  if (row.accountId && !session) unauthenticated();
  const db = env.PILOT_DB;
  const userId = row.accountId ?? crypto.randomUUID();
  const statements = [
    guard(
      db,
      `EXISTS(SELECT 1 FROM pilot_invite i JOIN pilot_member m ON m.id=i.member AND m.workspace=i.workspace
    WHERE i.digest=? AND i.used=0 AND i.expires>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND m.userId IS NULL AND m.email=? AND m.role=?)`,
      row.digest,
      row.email,
      row.role,
    ),
    guard(db, 'NOT EXISTS(SELECT 1 FROM pilot_member WHERE userId=?)', userId),
  ];
  if (!row.accountId) {
    if (!password) throw new Failure(400, 'PASSWORD_REQUIRED', 'Defina a senha da conta.');
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(password);
    const time = new Date().toISOString();
    statements.push(
      db
        .prepare(
          'INSERT INTO "user"(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,0,?,?)',
        )
        .bind(userId, name, row.email, time, time),
      db
        .prepare(
          "INSERT INTO account(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES(?,?,'credential',?,?,?,?)",
        )
        .bind(crypto.randomUUID(), userId, userId, hash, time, time),
    );
  }
  statements.push(
    db.prepare('UPDATE pilot_invite SET used=1 WHERE digest=?').bind(row.digest),
    db
      .prepare("UPDATE pilot_member SET status='active',userId=?,name=? WHERE workspace=? AND id=?")
      .bind(userId, name, row.workspace, row.member),
    db
      .prepare('UPDATE pilot_workspace SET revision=? WHERE id=?')
      .bind(crypto.randomUUID(), row.workspace),
  );
  try {
    await db.batch(statements);
  } catch (e) {
    if (isGuardFailure(e) || /constraint/i.test(String(e))) {
      await lookup(env, token);
      conflict('Esta conta já está vinculada ou o convite foi atualizado.');
    }
    throw e;
  }
  if (row.accountId) return json({ ok: true });
  const signed = await auth.api.signInEmail({
    body: { email: row.email, password: password! },
    headers: req.headers,
    asResponse: true,
  });
  if (!signed.ok)
    throw new Failure(503, 'SIGN_IN_REQUIRED', 'Conta ativada. Entre com a senha definida.');
  return json({ ok: true }, 200, signed.headers);
}
