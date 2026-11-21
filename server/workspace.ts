import type { AppStateData, Member } from '../src/types/domain';
import { materializePlanTasks } from '../src/utils/operations';
import type { PilotIdentity, PilotWorkspaceResponse } from '../src/types/pilot';
import { authFor } from './auth';
import { clock, Failure, guard, missing, unauthenticated, type PilotEnv } from './common';
function inactive(): never {
  throw new Failure(
    403,
    'MEMBERSHIP_INACTIVE',
    'O seu acesso ao espaço está inativo. Entre em contato com o administrador.',
  );
}
export interface MemberRow extends Member {
  workspace: string;
  userId: string | null;
}
export async function authenticate(env: PilotEnv, req: Request) {
  const session = await authFor(env).api.getSession({ headers: req.headers });
  if (!session) unauthenticated();
  return membershipFor(env, session.user.id);
}
export async function membershipFor(env: PilotEnv, userId: string) {
  const member = await env.PILOT_DB.prepare('SELECT * FROM pilot_member WHERE userId=?')
    .bind(userId)
    .first<MemberRow>();
  if (!member || member.status !== 'active') inactive();
  return {
    userId,
    memberId: member.id,
    workspaceId: member.workspace,
    role: member.role,
    email: member.email,
    name: member.name,
  } satisfies PilotIdentity;
}
export function activeGuard(env: PilotEnv, identity: PilotIdentity, admin = false) {
  return guard(
    env.PILOT_DB,
    "EXISTS(SELECT 1 FROM pilot_member WHERE workspace=? AND id=? AND userId=? AND status='active' AND role=?)",
    identity.workspaceId,
    identity.memberId,
    identity.userId,
    admin ? 'admin' : identity.role,
  );
}
export const entityKinds = [
  'sites',
  'assets',
  'templates',
  'records',
  'issues',
  'plans',
  'tasks',
  'templateDrafts',
] as const;
export type EntityKind = (typeof entityKinds)[number];
export async function workspace(
  env: PilotEnv,
  identity: PilotIdentity,
): Promise<PilotWorkspaceResponse> {
  const db = env.PILOT_DB;
  const id = identity.workspaceId;
  const [meta, members, entities] = await db.batch<Record<string, unknown>>([
    db.prepare('SELECT * FROM pilot_workspace WHERE id=?').bind(id),
    db
      .prepare(
        'SELECT id,name,role,email,status,jobTitle,userId FROM pilot_member WHERE workspace=? ORDER BY rowid',
      )
      .bind(id),
    db.prepare('SELECT kind,data FROM pilot_entity WHERE workspace=? ORDER BY rowid DESC').bind(id),
  ]);
  const row = meta.results[0];
  if (!row) missing();
  const list = members.results as unknown as MemberRow[];
  const member = list.find(
    (m) => m.id === identity.memberId && m.userId === identity.userId && m.status === 'active',
  );
  if (!member) inactive();
  const state: AppStateData = {
    revision: String(row.revision),
    company: JSON.parse(String(row.company)),
    members: list.map(({ userId, ...m }) => ({ ...m, invitationPending: !userId })),
    sites: [],
    assets: [],
    templates: [],
    records: [],
    issues: [],
    plans: [],
    tasks: [],
    templateDrafts: [],
  };
  for (const entity of entities.results) {
    const kind = entity.kind as EntityKind;
    if (entityKinds.includes(kind))
      (state[kind] as { id: string }[]).push(JSON.parse(String(entity.data)));
  }
  const currentClock = clock(String(row.timezone));
  const stored = new Set(state.tasks.map((task) => task.id));
  for (const plan of state.plans) {
    for (const task of materializePlanTasks(plan, currentClock.today)) {
      if (!stored.has(task.id)) state.tasks.push(task);
    }
  }
  return {
    ok: true,
    identity: { ...identity, role: member.role, name: member.name, email: member.email },
    state,
    ...currentClock,
  };
}
