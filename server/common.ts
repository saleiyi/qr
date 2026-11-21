import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface PilotEnv {
  PILOT_DB: D1Database;
  PILOT_FILES: R2Bucket;
  BETTER_AUTH_SECRET: string;
  APP_ORIGIN: string;
}
export class Failure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function invalid(message = 'Confira os dados enviados.'): never {
  throw new Failure(400, 'INVALID_INPUT', message);
}
export function denied(): never {
  throw new Failure(403, 'FORBIDDEN', 'Seu perfil não permite esta operação.');
}
export function missing(): never {
  throw new Failure(404, 'NOT_FOUND', 'Recurso não encontrado.');
}
export function conflict(
  message = 'Os dados foram atualizados. Recarregue e tente novamente.',
): never {
  throw new Failure(409, 'CONFLICT', message);
}
export function unauthenticated(): never {
  throw new Failure(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.');
}
export function originOf(value: string) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== value || !(url.protocol === 'https:' || (local && url.protocol === 'http:')))
    throw new Error('Origem inválida.');
  return value;
}
export async function digest(value: string | Uint8Array<ArrayBuffer>) {
  const buffer = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}
export function json(value: unknown, status = 200, headers?: Headers) {
  const result = new Headers(headers);
  result.set('content-type', 'application/json; charset=utf-8');
  result.set('cache-control', 'private, no-store');
  result.set('x-content-type-options', 'nosniff');
  return new Response(JSON.stringify(value), { status, headers: result });
}
export function guard(db: D1Database, condition: string, ...values: unknown[]) {
  // CHECK failure aborts the entire D1 transaction, including subsequent statements.
  return db
    .prepare('INSERT INTO pilot_guard(valid) SELECT 0 WHERE NOT (' + condition + ')')
    .bind(...values);
}
export function isGuardFailure(e: unknown) {
  return String(e).includes('pilot_cas');
}
export function calendarDay(instant: Date | string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}
export function clock(timezone: string) {
  const now = new Date();
  return { nowISO: now.toISOString(), today: calendarDay(now, timezone), timezone };
}
export async function readJson(request: Request, max: number) {
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
  )
    throw new Failure(415, 'MEDIA_TYPE', 'Envie dados JSON.');
  const tooLarge = () => new Failure(413, 'TOO_LARGE', 'A solicitação excede o tamanho permitido.');
  if (Number(request.headers.get('content-length')) > max) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) invalid();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > max) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
  } catch {
    invalid('JSON inválido.');
  }
}
export async function rateLimit(env: PilotEnv, req: Request, group: string, max: number) {
  const now = Math.floor(Date.now() / 60000);
  const key = await digest(group + '/' + (req.headers.get('cf-connecting-ip') || 'local'));
  const row = await env.PILOT_DB.prepare(
    `INSERT INTO pilot_limit(key,period,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN period=excluded.period THEN count+1 ELSE 1 END,period=excluded.period RETURNING count`,
  )
    .bind(key, now)
    .first<{ count: number }>();
  if (!row || row.count > max)
    throw new Failure(429, 'RATE_LIMIT', 'Muitas tentativas. Aguarde um minuto.');
  if (Math.random() < 0.02)
    await env.PILOT_DB.prepare('DELETE FROM pilot_limit WHERE period<?')
      .bind(now - 60)
      .run();
}
