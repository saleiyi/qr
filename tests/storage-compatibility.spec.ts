import { expect, test } from '@playwright/test';
import { SAMPLE_IMPORT_CSV } from '../src/utils/csv';

test('serialized storage preserves existing equipment creation and company settings', async ({
  page,
}) => {
  await page.goto('/app/assets');
  await page.getByRole('button', { name: 'Novo equipamento', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Novo equipamento', exact: true });
  await drawer.locator('#asset-name').fill('Equipamento com gravação serializada');
  await drawer.getByRole('button', { name: 'Cadastrar equipamento', exact: true }).click();
  await expect(drawer).toBeHidden();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).assets.some(
        (asset: { name: string }) => asset.name === 'Equipamento com gravação serializada',
      ),
    ),
  ).toBe(true);
  await page.goto('/app/settings');
  await page.locator('#comp-name').fill('Empresa com alterações preservadas');
  await page.getByRole('button', { name: 'Salvar dados da empresa', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).company.name),
    )
    .toBe('Empresa com alterações preservadas');
  await page.reload();
  await expect(page.locator('#comp-name')).toHaveValue('Empresa com alterações preservadas');
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).assets.some(
        (asset: { name: string }) => asset.name === 'Equipamento com gravação serializada',
      ),
    ),
  ).toBe(true);
});

test('serialized storage waits for real CSV import before showing confirmation', async ({
  page,
}) => {
  await page.goto('/app/assets');
  await page.getByRole('button', { name: 'Importar CSV', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Importar equipamentos via CSV' });
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({
      name: 'equipamentos.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(SAMPLE_IMPORT_CSV, 'utf8'),
    });
  const confirm = dialog.getByRole('button', { name: 'Confirmar importação (3)', exact: true });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(confirm).toBeHidden();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!),
  );
  expect(
    state.assets.filter((asset: { code: string }) =>
      ['EQ-101', 'EQ-102', 'EQ-103'].includes(asset.code),
    ),
  ).toHaveLength(3);
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).assets.length,
    ),
  ).toBe(29);
});
