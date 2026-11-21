import { expect, test } from '@playwright/test';
import { createInitialSeedData } from '../../src/data/seedData';

test('a clean company form adopts refreshed values before editing another field', async ({
  page,
}) => {
  let state = createInitialSeedData();
  state.company.city = 'Cidade inicial';
  state.revision = 'revision-1';
  const identity = {
    workspaceId: 'ui-workspace',
    userId: 'ui-user',
    memberId: state.members[0].id,
    role: 'admin',
    name: 'Gestora',
    email: 'gestora@example.com',
  };
  const snapshot = () => ({
    ok: true,
    identity,
    state,
    nowISO: new Date().toISOString(),
    today: '2026-11-21',
    timezone: 'America/Sao_Paulo',
  });
  await page.route('**/api/workspace', (route) => route.fulfill({ json: snapshot() }));
  let submitted: any;
  await page.route('**/api/commands', async (route) => {
    submitted = route.request().postDataJSON();
    state = { ...state, company: submitted.command.company, revision: 'revision-3' };
    await route.fulfill({ json: { ...snapshot(), result: {} } });
  });
  await page.goto('/app/settings');
  await expect(page.locator('#comp-city')).toHaveValue('Cidade inicial');
  state = {
    ...state,
    company: { ...state.company, city: 'Cidade atualizada por outra pessoa' },
    revision: 'revision-2',
  };
  await page.getByRole('button', { name: 'Atualizar registros', exact: true }).click();
  await expect(page.locator('#comp-city')).toHaveValue('Cidade atualizada por outra pessoa');
  await page.locator('#comp-name').fill('Empresa com novo nome');
  await page
    .locator('form[data-cloud-command="company.update"]')
    .getByRole('button', { name: /Salvar/ })
    .click();
  await expect.poll(() => submitted?.command?.company?.name).toBe('Empresa com novo nome');
  expect(submitted.revision).toBe('revision-2');
  expect(submitted.command.company.city).toBe('Cidade atualizada por outra pessoa');
});

test('editing a template without a form pauses refresh and retains button edits', async ({
  page,
}) => {
  const state = createInitialSeedData();
  const identity = {
    workspaceId: 'ui-workspace',
    userId: 'ui-user',
    memberId: state.members[0].id,
    role: 'admin',
    name: 'Gestora',
    email: 'gestora@example.com',
  };
  let reads = 0;
  await page.route('**/api/workspace', (route) => {
    reads += 1;
    return route.fulfill({
      json: {
        ok: true,
        identity,
        state,
        nowISO: new Date().toISOString(),
        today: '2026-11-21',
        timezone: 'America/Sao_Paulo',
      },
    });
  });
  await page.goto('/app/templates');
  const refresh = page.getByRole('button', { name: 'Atualizar registros', exact: true });
  const name = page.getByLabel('Nome do modelo', { exact: true });
  await name.fill('Modelo em edição que deve ser preservado');
  await name.blur();
  await expect(refresh).toBeDisabled();
  const before = reads;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(name).toHaveValue('Modelo em edição que deve ser preservado');
  expect(reads).toBe(before);
});
