import type {
  PilotCommand,
  PilotCommandRequest,
  PilotCommandResponse,
  PilotInviteCreated,
  PilotInvitationResponse,
  PilotWorkspaceResponse,
} from '../types/pilot';
import type { UserRole } from '../types/domain';

export class PilotHttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || value.includes('\\') || !value.startsWith('/') || value.startsWith('//'))
    return '/app';
  const path = value.split(/[?#]/, 1)[0];
  return path === '/app' || path.startsWith('/app/') || path.startsWith('/a/') ? value : '/app';
}

type RequestOptions = RequestInit & { workspaceId?: string };

export async function pilotRequest<T>(
  path: string,
  options: RequestOptions = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  if (!path.startsWith('/api/') || path.includes('\\')) throw new Error('Invalid API path');
  const { workspaceId, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (workspaceId) headers.set('X-Workspace-Id', workspaceId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetcher(path, {
      ...init,
      headers,
      credentials: 'same-origin',
      signal: init.signal ?? controller.signal,
    });
    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new PilotHttpError(
        response.status,
        'SERVER_ERROR',
        'O serviço não respondeu corretamente. Tente atualizar em alguns instantes.',
      );
    }
    if (!response.ok || data.ok === false) {
      throw new PilotHttpError(
        response.status,
        typeof data.code === 'string'
          ? data.code
          : response.status === 401
            ? 'UNAUTHENTICATED'
            : 'SERVER_ERROR',
        typeof data.error === 'string'
          ? data.error
          : typeof data.message === 'string'
            ? data.message
            : 'Não foi possível concluir. Tente novamente.',
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof PilotHttpError) throw error;
    throw new PilotHttpError(
      0,
      'NETWORK',
      'Sem conexão com o serviço. Suas alterações não foram confirmadas; atualize antes de tentar novamente.',
    );
  } finally {
    clearTimeout(timer);
  }
}

export function isWorkspaceResponse(value: unknown): value is PilotWorkspaceResponse {
  const data = value as PilotWorkspaceResponse;
  return Boolean(
    data?.ok &&
    data.identity?.workspaceId &&
    data.identity?.memberId &&
    data.identity?.userId &&
    data.state?.company &&
    Array.isArray(data.state.assets) &&
    Array.isArray(data.state.records) &&
    Array.isArray(data.state.templates) &&
    Array.isArray(data.state.members) &&
    data.nowISO &&
    data.today &&
    data.timezone,
  );
}

export const pilotApi = {
  workspace: () => pilotRequest<PilotWorkspaceResponse>('/api/workspace'),
  session: () => pilotRequest<PilotWorkspaceResponse>('/api/session'),
  login: (email: string, password: string) =>
    pilotRequest('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => pilotRequest('/api/auth/sign-out', { method: 'POST', body: '{}' }),
  invitation: (token: string) =>
    pilotRequest<PilotInvitationResponse>('/api/invitations/preview', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  acceptInvitation: (token: string, name: string, password: string) =>
    pilotRequest('/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token, name, password }),
    }),
  invite: (workspaceId: string, input: { email: string; name: string; role: UserRole }) =>
    pilotRequest<PilotInviteCreated>('/api/invitations', {
      method: 'POST',
      workspaceId,
      body: JSON.stringify(input),
    }),
  command: (workspaceId: string, command: PilotCommand, revision?: string) => {
    const body: PilotCommandRequest = { requestId: crypto.randomUUID(), revision, command };
    return pilotRequest<PilotCommandResponse>('/api/commands', {
      method: 'POST',
      workspaceId,
      body: JSON.stringify(body),
    });
  },
};
