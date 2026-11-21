import { z } from 'zod';
import { digest, originOf, type PilotEnv } from './common';
export const emailSchema = z
  .email()
  .max(254)
  .transform((e) => e.toLowerCase());
export const nameSchema = z.string().trim().min(1).max(120);
export async function invitationKey(origin: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  return {
    digest: await digest(token),
    expiresAt,
    invitationUrl: originOf(origin) + '/activate#' + token,
  };
}
type Details = { name: string; email: string; companyName: string };
async function provisionData(details: Details, origin: string) {
  const input = z
    .strictObject({ name: nameSchema, email: emailSchema, companyName: nameSchema })
    .parse(details);
  const workspaceId = crypto.randomUUID(),
    memberId = crypto.randomUUID();
  const key = await invitationKey(origin);
  const site = { id: crypto.randomUUID(), name: 'Unidade principal', city: '', address: '' };
  const template = {
    id: crypto.randomUUID(),
    name: 'Inspeção básica',
    version: 1,
    category: 'Geral',
    description: 'Verificação das condições do equipamento.',
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: 'condicao',
        section: 'Verificação geral',
        label: 'O equipamento está em boas condições de operação?',
        type: 'check',
        required: true,
        photoRequired: false,
      },
    ],
  };
  const company = {
    name: input.companyName,
    tradeName: input.companyName,
    cnpj: '',
    city: '',
    contactEmail: input.email,
  };
  const rows: [string, string[]][] = [
    [
      'INSERT INTO pilot_workspace(id,company,timezone,revision) VALUES(?,?,?,?)',
      [workspaceId, JSON.stringify(company), 'America/Sao_Paulo', crypto.randomUUID()],
    ],
    [
      "INSERT INTO pilot_member(id,workspace,email,name,role,status) VALUES(?,?,?,?,'admin','inactive')",
      [memberId, workspaceId, input.email, input.name],
    ],
    [
      'INSERT INTO pilot_invite(digest,workspace,member,expires) VALUES(?,?,?,?)',
      [key.digest, workspaceId, memberId, key.expiresAt],
    ],
    [
      "INSERT INTO pilot_entity(workspace,kind,id,data) VALUES(?,'sites',?,?)",
      [workspaceId, site.id, JSON.stringify(site)],
    ],
    [
      "INSERT INTO pilot_entity(workspace,kind,id,data) VALUES(?,'templates',?,?)",
      [workspaceId, template.id, JSON.stringify(template)],
    ],
  ];
  return {
    rows,
    workspaceId,
    memberId,
    invitationUrl: key.invitationUrl,
    expiresAt: key.expiresAt,
  };
}
export async function provisionWorkspace(env: PilotEnv, details: Details) {
  const { rows, ...result } = await provisionData(details, env.APP_ORIGIN);
  await env.PILOT_DB.batch(rows.map(([sql, params]) => env.PILOT_DB.prepare(sql).bind(...params)));
  return result;
}
export async function prepareWorkspaceProvision({
  origin,
  ...details
}: Details & { origin: string }) {
  const { rows, ...result } = await provisionData(details, origin);
  const sql = rows
    .map(([statement, params]) => {
      let i = 0;
      return statement.replace(/\?/g, () => "'" + params[i++].replaceAll("'", "''") + "'") + ';';
    })
    .join('\n');
  return { ...result, sql };
}
