import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { PilotCommandRequest, PilotIdentity } from '../src/types/pilot';
import { activeGuard, workspace } from './workspace';
import { applyCommand, authorize, type Mutation } from './commands';
import { digest, guard, isGuardFailure, conflict, type PilotEnv } from './common';
import { envelope } from './schema';
import { Files } from './files';
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
function writes(env: PilotEnv, w: string, mutation: Mutation) {
  const db = env.PILOT_DB;
  const result: D1PreparedStatement[] = [];
  for (const [kind, items] of Object.entries(mutation.put)) {
    // A bound JSON array keeps a plan's tasks in one atomic batch without one SQL statement per task.
    for (let i = 0; i < items.length; i += 100) {
      const sql =
        `INSERT INTO pilot_entity(workspace,kind,id,data) SELECT ?,?,json_extract(value,'$.id'),value FROM json_each(?) WHERE 1` +
        (kind === 'records'
          ? ''
          : ' ON CONFLICT(workspace,kind,id) DO UPDATE SET data=excluded.data');
      result.push(db.prepare(sql).bind(w, kind, JSON.stringify(items.slice(i, i + 100))));
    }
  }
  if (mutation.removeDraft)
    result.push(
      db
        .prepare("DELETE FROM pilot_entity WHERE workspace=? AND kind='templateDrafts' AND id=?")
        .bind(w, mutation.removeDraft),
    );
  if (mutation.company)
    result.push(
      db
        .prepare('UPDATE pilot_workspace SET company=? WHERE id=?')
        .bind(JSON.stringify(mutation.company), w),
    );
  if (mutation.member) {
    const m = mutation.member;
    result.push(
      db
        .prepare(
          'UPDATE pilot_member SET name=?,jobTitle=?,role=?,status=? WHERE workspace=? AND id=?',
        )
        .bind(m.name, m.jobTitle, m.role, m.status, w, m.id),
    );
  }
  return result;
}
interface Receipt {
  id: string;
  actor: string;
  digest: string;
  result: string;
  inspectionKey: string | null;
}
export async function runCommand(env: PilotEnv, identity: PilotIdentity, body: unknown) {
  const { requestId, revision, command } = envelope.parse(body) as PilotCommandRequest;
  const inspection = command.type === 'inspection.submit';
  const key = inspection ? command.input.idempotencyKey : null;
  const fingerprint = await digest(canonical(command));
  const w = identity.workspaceId,
    db = env.PILOT_DB;
  for (let attempt = 0; attempt < 6; attempt++) {
    const live = await workspace(env, identity);
    authorize(command, live);
    const receipt = await db
      .prepare(
        'SELECT id,actor,digest,result,inspectionKey FROM pilot_command WHERE workspace=? AND (id=? OR inspectionKey=?) ORDER BY (id=?) DESC LIMIT 1',
      )
      .bind(w, requestId, key, requestId)
      .first<Receipt>();
    if (receipt && (receipt.actor !== identity.memberId || receipt.digest !== fingerprint))
      conflict('Identificador de operação já utilizado com outros dados.');
    if (receipt?.id === requestId)
      return { ...(await workspace(env, identity)), result: JSON.parse(receipt.result) };
    if (!inspection && (!revision || revision !== live.state.revision)) conflict();
    const files = new Files(env, w);
    const mutation: Mutation = receipt
      ? {
          put: {},
          result: { ...JSON.parse(receipt.result), createdIssuesCount: 0, alreadyCompleted: true },
        }
      : await applyCommand(command, live, files);
    const nextRevision = crypto.randomUUID();
    const statements = [
      activeGuard(env, live.identity),
      guard(
        db,
        'EXISTS(SELECT 1 FROM pilot_workspace WHERE id=? AND revision=?)',
        w,
        live.state.revision,
      ),
      ...writes(env, w, mutation),
      db
        .prepare(
          'INSERT INTO pilot_command(workspace,id,digest,actor,type,at,result,inspectionKey) VALUES(?,?,?,?,?,?,?,?)',
        )
        .bind(
          w,
          requestId,
          fingerprint,
          identity.memberId,
          command.type,
          live.nowISO,
          JSON.stringify(mutation.result),
          receipt ? null : key,
        ),
      db.prepare('UPDATE pilot_workspace SET revision=? WHERE id=?').bind(nextRevision, w),
    ];
    await files.flush();
    try {
      await db.batch(statements);
    } catch (e) {
      if (isGuardFailure(e) || String(e).includes('UNIQUE constraint failed: pilot_command'))
        continue;
      throw e;
    }
    // This authorized command may revoke its own access. Acknowledge the committed
    // snapshot, without issuing a fresh read under the now-inactive membership.
    const member = mutation.member;
    if (member?.id === identity.memberId && member.status === 'inactive') {
      const state = {
        ...live.state,
        revision: nextRevision,
        members: live.state.members.map((m) => (m.id === member.id ? member : m)),
      };
      return {
        ...live,
        identity: { ...live.identity, role: member.role, name: member.name },
        state,
        result: mutation.result,
      };
    }
    const updated = await workspace(env, identity);
    return { ...updated, result: mutation.result };
  }
  conflict();
}
