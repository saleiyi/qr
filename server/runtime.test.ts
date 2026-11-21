import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { prepareWorkspaceProvision } from './provision';

test('workerd can activate an owner, set a secure cookie, and authenticate a second session with the installed Better Auth library', async (t) => {
  const bundle = await build({
    stdin: {
      contents:
        "import {onRequest} from './functions/api/[[path]].ts'; export default {fetch:(request,env)=>onRequest({request,env})}",
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: 'neutral',
    conditions: ['workerd', 'worker', 'browser'],
    mainFields: ['module', 'main'],
    format: 'esm',
    target: 'es2022',
    external: ['node:*', 'cloudflare:*', 'bun:*'],
    define: { 'process.env.NODE_ENV': '"production"' },
    write: false,
  });
  const origin = 'https://pilot.example.test';
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      cf: false,
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: '2026-11-01',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: ['PILOT_DB'],
      r2Buckets: ['PILOT_FILES'],
      bindings: {
        APP_ORIGIN: origin,
        BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
      },
    }),
  );
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('PILOT_DB');
  const dir = new URL('../migrations/', import.meta.url);
  const migration = (
    await Promise.all(
      (await readdir(dir))
        .filter((name) => name.endsWith('.sql'))
        .sort()
        .map((name) => readFile(new URL(name, dir), 'utf8')),
    )
  ).join('\n');
  await db.batch(
    migration
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql)),
  );
  const email = 'runtime@example.test',
    password = crypto.randomUUID(),
    name = 'Técnica';
  const invite = await prepareWorkspaceProvision({
    email,
    name,
    origin,
    companyName: 'Teste de ativação',
  });
  await db.batch(
    invite.sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sql) => db.prepare(sql)),
  );
  const post = (path: string, body: unknown, cookie = '') =>
    mf.dispatchFetch(origin + path, {
      method: 'POST',
      headers: { origin, cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const response = await post('/api/invitations/accept', {
    token: new URL(invite.invitationUrl).hash.slice(1),
    name,
    password,
  });
  assert.equal(response.status, 200, await response.text());
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  const login = await post('/api/auth/sign-in/email', { email, password });
  assert.equal(login.status, 200, await login.text());
  const authCookie = login.headers.get('set-cookie')!.split(';')[0];
  const live = await mf.dispatchFetch(origin + '/api/session', { headers: { cookie: authCookie } });
  assert.equal(live.status, 200);
  const value = (await live.json()) as { identity: { role: string; email: string } };
  assert.equal(value.identity.role, 'admin');
  assert.equal(value.identity.email, email);
});
