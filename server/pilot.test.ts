import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';

const origin = 'http://localhost:8788';
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WgcAAAAASUVORK5CYII=';
test('local D1 and R2 enforce invitation, roles, record concurrency and private file ownership', async (t) => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      cf: false,
      modules: true,
      script: 'export default {fetch(){return new Response()}}',
      d1Databases: ['PILOT_DB', 'RESTORE_DB'],
      r2Buckets: ['PILOT_FILES', 'RESTORE_FILES'],
      compatibilityDate: '2026-11-01',
    }),
  );
  t.after(() => mf.dispose());
  const { handlePilot } = await import('./http');
  const { provisionWorkspace } = await import('./provision');
  const env = {
    PILOT_DB: await mf.getD1Database('PILOT_DB'),
    PILOT_FILES: await mf.getR2Bucket('PILOT_FILES'),
    APP_ORIGIN: origin,
    BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
  } as unknown as import('./common').PilotEnv;
  const migration = await readFile(
    new URL('../migrations/0001_pilot.sql', import.meta.url),
    'utf8',
  );
  const db = env.PILOT_DB;
  await db.batch(
    migration
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql)),
  );
  const api = (path: string, cookie = '', body?: unknown) =>
    handlePilot(
      new Request(origin + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { origin, cookie, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      env,
    );
  const ok = async (r: Response) => {
    const v: any = await r.json();
    assert.equal(r.status, 200, JSON.stringify(v));
    return v;
  };
  const password = crypto.randomUUID();
  const accept = async (url: string, name: string) => {
    const token = new URL(url).hash.slice(1);
    const preview = await ok(await api('/api/invitations/preview', '', { token }));
    assert.equal(preview.invitation.name, name);
    assert.equal(
      (
        await api('/api/invitations/accept', '', {
          token,
          name,
          password,
          role: 'admin',
          email: 'other@example.test',
        })
      ).status,
      400,
    );
    const r = await api('/api/invitations/accept', '', { token, name, password });
    await ok(r);
    const cookie = r.headers.getSetCookie()[0]?.split(';')[0];
    assert.ok(cookie);
    assert.equal((await api('/api/invitations/accept', '', { token, name, password })).status, 410);
    return cookie;
  };
  const createOwner = async (email: string) => {
    const provisioned = await provisionWorkspace(env, {
      email,
      name: 'Responsável',
      companyName: 'Oficina',
    });
    return accept(provisioned.invitationUrl, 'Responsável');
  };
  assert.equal((await api('/api/workspace')).status, 401);
  assert.equal((await api('/api/auth/sign-up/email', '', {})).status, 404);
  const admin = await createOwner('owner@example.test');
  const workspace = async (cookie: string) => ok(await api('/api/workspace', cookie));
  let a = await workspace(admin);
  assert.equal(a.state.sites.length, 1);
  assert.equal(a.state.members.length, 1);
  assert.equal(a.state.templates.length, 1);
  for (const kind of ['assets', 'issues', 'records', 'plans', 'tasks'])
    assert.equal(a.state[kind].length, 0);
  assert.ok(Math.abs(Date.now() - Date.parse(a.nowISO)) < 10000);
  const invite = async (role: string) => {
    const email = role + '@example.test';
    const invitation = await ok(await api('/api/invitations', admin, { email, name: role, role }));
    return accept(invitation.invitationUrl, role);
  };
  const operator = await invite('operator');
  const viewer = await invite('viewer');
  const other = await createOwner('other@example.test');
  const op = await workspace(operator);
  a = await workspace(admin);
  const cmd = (
    cookie: string,
    revision: string,
    command: any,
    requestId: string = crypto.randomUUID(),
  ) => api('/api/commands', cookie, { revision, requestId, command });
  const template = a.state.templates[0];
  const draft = {
    code: 'EQ-001',
    name: 'Equipamento novo',
    category: 'Energia',
    siteId: a.state.sites[0].id,
    sector: 'Oficina',
    assigneeId: op.identity.memberId,
    operationalStatus: 'active',
    inspectionCycleDays: 7,
    templateId: template.id,
    lastInspectionAt: null,
    nextInspectionDue: null,
    manufacturer: '',
    model: '',
    serialNumber: '',
    notes: '',
  };
  const create = { type: 'asset.create', draft };
  assert.equal((await cmd('', a.state.revision, create)).status, 401);
  for (const who of [operator, viewer])
    assert.equal((await cmd(who, a.state.revision, create)).status, 403);
  await t.test('write requests require JSON, same origin, and the current workspace', async () => {
    const body = JSON.stringify({
      requestId: crypto.randomUUID(),
      revision: a.state.revision,
      command: create,
    });
    const send = (overrides: Record<string, string>) =>
      handlePilot(
        new Request(origin + '/api/commands', {
          method: 'POST',
          headers: { origin, cookie: admin, 'content-type': 'application/json', ...overrides },
          body,
        }),
        env,
      );
    assert.equal((await send({ origin: 'https://elsewhere.example.test' })).status, 403);
    assert.equal((await send({ 'content-type': 'text/plain' })).status, 415);
    const stale = await send({ 'x-workspace-id': 'outdated' });
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).code, 'SESSION_CHANGED');
  });
  const rid = crypto.randomUUID();
  const created = await ok(await cmd(admin, a.state.revision, create, rid));
  const asset = created.result.asset;
  assert.equal(
    (await ok(await cmd(admin, a.state.revision, create, rid))).result.asset.id,
    asset.id,
  );
  assert.equal(
    (await cmd(admin, a.state.revision, { ...create, draft: { ...draft, code: 'EQ-002' } }, rid))
      .status,
    409,
  );
  assert.equal(
    (
      await cmd(admin, a.state.revision, {
        type: 'asset.status',
        assetId: asset.id,
        status: 'inactive',
      })
    ).status,
    409,
  );
  const foreign = await workspace(other);
  assert.equal(
    (
      await cmd(other, foreign.state.revision, {
        type: 'asset.status',
        assetId: asset.id,
        status: 'inactive',
      })
    ).status,
    404,
  );
  const input = {
    assetId: asset.id,
    templateId: template.id,
    templateVersion: template.version,
    inspectorId: op.identity.memberId,
    generalNotes: 'Conferido',
    idempotencyKey: crypto.randomUUID(),
    answers: {
      [template.items[0].id]: {
        status: 'non_conforming',
        note: 'Vazamento identificado',
        photoDataUrl: png,
      },
    },
  };
  const submit = (overrides: any = {}) => ({
    type: 'inspection.submit',
    input: { ...input, ...overrides },
  });
  assert.equal(
    (await cmd(operator, a.state.revision, submit({ inspectorId: a.identity.memberId }))).status,
    403,
  );
  assert.equal(
    (
      await cmd(
        operator,
        a.state.revision,
        submit({
          answers: {
            [template.items[0].id]: {
              status: 'conforming',
              photoDataUrl: 'data:image/png;base64,Zm9v',
            },
          },
        }),
      )
    ).status,
    400,
  );
  const responses = await Promise.all([
    cmd(operator, a.state.revision, submit()),
    cmd(operator, a.state.revision, submit()),
  ]);
  const first = await ok(responses[0]);
  const second = await ok(responses[1]);
  assert.equal(first.result.record.id, second.result.record.id);
  const record = first.result.record;
  const live = await workspace(admin);
  assert.equal(live.state.records.length, 1);
  assert.equal(live.state.issues.length, 1);
  assert.equal(live.state.assets[0].lastInspectionAt, record.submittedAt);
  assert.equal(record.inspectorNameSnapshot, 'operator');
  assert.equal(record.inspectorId, op.identity.memberId);
  const photo = record.answers[0].photoDataUrl;
  const foreignDraft = {
    ...draft,
    templateId: foreign.state.templates[0].id,
    siteId: foreign.state.sites[0].id,
    assigneeId: foreign.identity.memberId,
    photoDataUrl: photo,
  };
  assert.equal(
    (await cmd(other, foreign.state.revision, { type: 'asset.create', draft: foreignDraft }))
      .status,
    404,
  );
  assert.match(photo, /^\/api\/files\//);
  const file = await api(photo, admin);
  assert.equal(file.headers.get('content-type'), 'image/png');
  assert.match(file.headers.get('cache-control')!, /no-store/);
  assert.equal(Buffer.from(await file.arrayBuffer()).toString('base64'), png.split(',')[1]);
  assert.equal((await api(photo, other)).status, 404);
  assert.equal((await api(photo)).status, 401);
  assert.equal((await api('/api/export', operator)).status, 403);
  assert.equal((await ok(await api('/api/export', admin))).workspace.state.records.length, 1);
  await t.test(
    'operator handles only assigned orders, admin reviews, and an assigned plan task is completed once',
    async () => {
      const issueId = live.state.issues[0].id;
      const change = async (who: string, actorId: string, action: string, details: object = {}) =>
        cmd(who, (await workspace(who)).state.revision, {
          type: 'issue.change',
          issueId,
          action,
          change: { actorId, ...details },
        });
      assert.equal(
        (
          await change(operator, op.identity.memberId, 'assign', {
            assigneeId: a.identity.memberId,
            dueDate: live.today,
          })
        ).status,
        403,
      );
      await ok(
        await change(admin, a.identity.memberId, 'assign', {
          assigneeId: a.identity.memberId,
          dueDate: live.today,
        }),
      );
      assert.equal((await change(operator, op.identity.memberId, 'start')).status, 403);
      await ok(
        await change(admin, a.identity.memberId, 'assign', {
          assigneeId: op.identity.memberId,
          dueDate: live.today,
        }),
      );
      await ok(await change(operator, op.identity.memberId, 'start'));
      await ok(
        await change(operator, op.identity.memberId, 'submit', {
          note: 'Ajuste concluído',
          photoDataUrl: photo,
        }),
      );
      await ok(await change(admin, a.identity.memberId, 'approve'));
      const saved = await ok(
        await cmd(admin, (await workspace(admin)).state.revision, {
          type: 'plan.save',
          draft: {
            name: 'Plano local',
            assetIds: [asset.id],
            templateId: template.id,
            assigneeId: op.identity.memberId,
            startDate: live.today,
            frequency: 'weekly',
          },
        }),
      );
      const task = saved.state.tasks.find(
        (x: any) => x.planId === saved.result.plan.id && x.dueDate === live.today,
      );
      assert.ok(task);
      assert.equal(
        (
          await cmd(
            admin,
            saved.state.revision,
            submit({
              inspectorId: a.identity.memberId,
              taskId: task.id,
              idempotencyKey: crypto.randomUUID(),
            }),
          )
        ).status,
        403,
      );
      const completed = await Promise.all(
        [0, 1].map(() =>
          cmd(
            operator,
            saved.state.revision,
            submit({
              taskId: task.id,
              idempotencyKey: crypto.randomUUID(),
              answers: { [template.items[0].id]: { status: 'conforming' } },
            }),
          ),
        ),
      );
      const [one, two] = await Promise.all(completed.map(ok));
      assert.equal(one.result.record.id, two.result.record.id);
      assert.equal(
        (await workspace(admin)).state.tasks.find((x: any) => x.id === task.id).status,
        'completed',
      );
    },
  );
  await t.test(
    'renewal, pending status, and authenticated existing-account membership checks',
    async () => {
      const info = { name: 'Acesso', email: 'pending@example.test', role: 'viewer' };
      const old = await ok(await api('/api/invitations', admin, info));
      const pending = (await workspace(admin)).state.members.find(
        (m: any) => m.id === old.memberId,
      );
      assert.equal(pending.invitationPending, true);
      assert.equal(
        (
          await cmd(admin, (await workspace(admin)).state.revision, {
            type: 'member.update',
            memberId: old.memberId,
            patch: { status: 'active' },
          })
        ).status,
        409,
      );
      const renewed = await ok(await api('/api/invitations', admin, { ...info, role: 'operator' }));
      assert.equal(old.memberId, renewed.memberId);
      assert.equal(
        (
          await api('/api/invitations/preview', '', {
            token: new URL(old.invitationUrl).hash.slice(1),
          })
        ).status,
        410,
      );
      assert.equal(
        (
          await ok(
            await api('/api/invitations/preview', '', {
              token: new URL(renewed.invitationUrl).hash.slice(1),
            }),
          )
        ).invitation.role,
        'operator',
      );
      const existing = await ok(
        await api('/api/invitations', other, {
          name: 'Convite',
          email: 'operator@example.test',
          role: 'admin',
        }),
      );
      const claim = {
        token: new URL(existing.invitationUrl).hash.slice(1),
        name: 'Convite',
        password,
      };
      assert.equal((await api('/api/invitations/accept', '', claim)).status, 401);
      assert.equal((await api('/api/invitations/accept', viewer, claim)).status, 403);
      assert.equal((await api('/api/invitations/accept', operator, claim)).status, 409);
      assert.equal((await workspace(operator)).identity.workspaceId, op.identity.workspaceId);
    },
  );
  await t.test(
    'D1 SQL and private R2 files restore into separate disposable bindings',
    async () => {
      const dump = await db
        .prepare('PRAGMA miniflare_d1_export(?,?,?);')
        .bind(0, 0)
        .raw<string[]>();
      const restoredDb = await mf.getD1Database('RESTORE_DB');
      await restoredDb.batch(dump[0].map((line) => restoredDb.prepare(String(line))));
      const bucket = await mf.getR2Bucket('RESTORE_FILES');
      const backup = await ok(await api('/api/export', admin));
      for (const url of backup.files) {
        const source = await api(url, admin);
        const key = backup.workspace.id + '/' + url.split('/').at(-1);
        await bucket.put(key, await source.arrayBuffer(), {
          httpMetadata: { contentType: source.headers.get('content-type')! },
        });
      }
      const restored = {
        ...env,
        PILOT_DB: restoredDb,
        PILOT_FILES: bucket,
      } as unknown as typeof env;
      const read = (path: string) =>
        handlePilot(new Request(origin + path, { headers: { cookie: admin } }), restored);
      const exportAgain = await ok(await read('/api/export'));
      assert.deepEqual(exportAgain.workspace, backup.workspace);
      assert.deepEqual(exportAgain.files, backup.files);
      const bytes = await (await read(photo)).arrayBuffer();
      assert.equal(Buffer.from(bytes).toString('base64'), png.split(',')[1]);
    },
  );
  await t.test(
    'a previously scheduled daily plan materializes its rolling window on a new day',
    async () => {
      const earlier = new Date(live.today + 'T12:00:00Z');
      earlier.setUTCDate(earlier.getUTCDate() - 180);
      const plan = {
        id: 'historical-plan',
        name: 'Plano anterior',
        assetIds: [asset.id],
        templateId: template.id,
        assigneeId: op.identity.memberId,
        startDate: earlier.toISOString().slice(0, 10),
        frequency: 'daily',
        createdAt: earlier.toISOString(),
      };
      await db
        .prepare("INSERT INTO pilot_entity(workspace,kind,id,data) VALUES(?,'plans',?,?)")
        .bind(a.identity.workspaceId, plan.id, JSON.stringify(plan))
        .run();
      const reopened = await workspace(operator);
      assert.ok(
        reopened.state.tasks.some(
          (task: any) => task.planId === plan.id && task.dueDate === live.today,
        ),
      );
    },
  );
  const edit = await ok(
    await cmd(admin, (await workspace(admin)).state.revision, {
      type: 'template.publish',
      template: { ...template, name: 'Modelo novo' },
    }),
  );
  assert.equal(edit.state.records[0].templateNameSnapshot, template.name);
  assert.equal(
    (await cmd(operator, edit.state.revision, submit({ idempotencyKey: crypto.randomUUID() })))
      .status,
    409,
  );
  assert.equal(
    (
      await cmd(admin, edit.state.revision, {
        type: 'member.update',
        memberId: a.identity.memberId,
        patch: { status: 'inactive' },
      })
    ).status,
    409,
  );
  await ok(
    await cmd(admin, edit.state.revision, {
      type: 'member.update',
      memberId: op.identity.memberId,
      patch: { status: 'inactive' },
    }),
  );
  assert.equal((await api('/api/session', operator)).status, 403);
  assert.equal((await api(photo, operator)).status, 403);
  assert.equal((await api('/api/auth/get-session', operator)).status, 403);
  await ok(await api('/api/auth/sign-out', viewer, {}));
  assert.equal((await api('/api/session', viewer)).status, 401);
  await t.test(
    'a second administrator can keep the workspace running when the first disables their own account',
    async () => {
      const promotion = await ok(
        await cmd(admin, (await workspace(admin)).state.revision, {
          type: 'member.update',
          memberId: (await workspace(admin)).state.members.find(
            (m: any) => m.email === 'viewer@example.test',
          ).id,
          patch: { role: 'admin' },
        }),
      );
      const result = await cmd(admin, promotion.state.revision, {
        type: 'member.update',
        memberId: a.identity.memberId,
        patch: { status: 'inactive' },
      });
      assert.equal(result.status, 200);
      assert.equal((await api('/api/session', admin)).status, 403);
    },
  );
  await t.test(
    'invitation attempts share an atomic, persistent rate limit across requests',
    async () => {
      const token = '0'.repeat(64);
      let limited = false;
      for (let i = 0; i <= 30; i++) {
        const response = await api('/api/invitations/preview', '', { token });
        if (response.status === 429) {
          limited = true;
          break;
        }
        assert.equal(response.status, 410);
      }
      assert.ok(limited);
    },
  );
});
