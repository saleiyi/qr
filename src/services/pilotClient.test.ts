import test from 'node:test';
import assert from 'node:assert/strict';
import { PilotHttpError, pilotRequest, safeReturnPath } from './pilotClient';
import { configurePilotClock, currentPilotClock } from './runtimeMode';

test('login return targets stay inside equipment and management routes', () => {
  assert.equal(
    safeReturnPath('/a/asset-123/inspect?taskId=t-1'),
    '/a/asset-123/inspect?taskId=t-1',
  );
  assert.equal(safeReturnPath('/app/records'), '/app/records');
  for (const value of [
    'https://other.example/app',
    '//other.example/app',
    '/\\other.example/app',
    '/login',
    '/api/export',
    'javascript:alert(1)',
  ]) {
    assert.equal(safeReturnPath(value), '/app', value);
  }
});

test('an expired session is surfaced rather than turned into local demo data', async () => {
  const fetcher = async () =>
    new Response(
      JSON.stringify({ ok: false, code: 'UNAUTHENTICATED', error: 'Entre novamente.' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    );
  await assert.rejects(
    pilotRequest('/api/workspace', {}, fetcher as typeof fetch),
    (error: unknown) =>
      error instanceof PilotHttpError && error.status === 401 && error.code === 'UNAUTHENTICATED',
  );
});

test('unexpected HTML and network failures remain explicit failures', async () => {
  await assert.rejects(
    pilotRequest(
      '/api/workspace',
      {},
      (async () => new Response('<html>upstream error</html>', { status: 502 })) as typeof fetch,
    ),
    (error: unknown) => error instanceof PilotHttpError && error.status === 502,
  );
  await assert.rejects(
    pilotRequest('/api/workspace', {}, (async () => {
      throw new TypeError('offline');
    }) as typeof fetch),
    (error: unknown) => error instanceof PilotHttpError && error.code === 'NETWORK',
  );
});

test('API client cannot send a credentialed request to an external origin', async () => {
  let called = false;
  await assert.rejects(
    pilotRequest('https://other.example/api/workspace', {}, (async () => {
      called = true;
      return new Response('{}');
    }) as typeof fetch),
  );
  assert.equal(called, false);
});

test('live clock respects the server offset and workspace timezone across midnight', () => {
  try {
    configurePilotClock(
      { nowISO: '2026-12-01T02:59:59.000Z', today: '2026-11-30', timezone: 'America/Sao_Paulo' },
      0,
    );
    assert.deepEqual(currentPilotClock(0), {
      nowISO: '2026-12-01T02:59:59.000Z',
      today: '2026-11-30',
      timezone: 'America/Sao_Paulo',
    });
    assert.equal(currentPilotClock(2000)?.today, '2026-12-01');
  } finally {
    configurePilotClock(null);
  }
  assert.equal(currentPilotClock(), null);
});
