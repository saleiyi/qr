import { expect, test } from '@playwright/test';
import { createInitialSeedData } from '../../src/data/seedData';

test('a schedule capacity warning preserves access to records and disables only new plans', async ({
  page,
}) => {
  const state = createInitialSeedData();
  const warning = 'A agenda precisa de manutenção. Os registros enviados continuam disponíveis.';
  state.scheduleWarnings = [warning];
  const identity = {
    workspaceId: 'ui-workspace',
    userId: 'ui-user',
    memberId: state.members[0].id,
    role: 'admin',
    name: 'Gestora',
    email: 'gestora@example.com',
  };
  await page.route('**/api/workspace', (route) =>
    route.fulfill({
      json: {
        ok: true,
        identity,
        state,
        scheduleWarning: warning,
        nowISO: new Date().toISOString(),
        today: '2026-11-21',
        timezone: 'America/Sao_Paulo',
      },
    }),
  );
  await page.goto('/app/plans');
  await expect(page.getByRole('alert').filter({ hasText: warning })).toBeVisible();
  await expect(page.getByRole('button', { name: /Novo plano/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Registros e relatórios', exact: true }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Registros e relatórios', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Relatório para impressão/ })).toBeEnabled();
});
