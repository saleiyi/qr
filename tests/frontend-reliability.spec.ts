import { expect, test, type Page } from '@playwright/test';
import { createInitialSeedData } from '../src/data/seedData';

const evidencePhoto =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';

async function seedReport(page: Page) {
  const state = createInitialSeedData();
  state.records = state.records.slice(0, 25).map((record, index) => ({
    ...record,
    assetNameSnapshot: `Equipamento para relatório ${index + 1}`,
  }));
  state.records[0].generalNotes = 'Observação geral que deve acompanhar o relatório.';
  state.records[0].answers[0].note = 'Evidência individual: proteção revisada no local.';
  state.records[0].answers[0].photoDataUrl = evidencePhoto;
  state.records[0].answers[0].photoName = 'protecao.png';
  await page.addInitScript((initialState) => {
    if (!localStorage.getItem('ativos_demo_state_v1')) {
      localStorage.setItem('ativos_demo_state_v1', JSON.stringify(initialState));
    }
  }, state);
}

async function failDraftWrites(page: Page) {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreDraftStorage: () => void }).restoreDraftStorage = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('ativos_demo_draft_v1_')) {
        throw new DOMException('Storage quota reached', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
  });
}

test('report includes every filtered inspection above twenty records', async ({ page }) => {
  await seedReport(page);
  await page.goto('/app/records');
  await page.getByRole('button', { name: 'Relatório para impressão / PDF' }).click();
  const report = page.getByRole('dialog', { name: 'Prévia do relatório para impressão ou PDF' });
  await expect(report).toContainText('Registros incluídos: 25');
  await expect(report.getByText('Equipamento para relatório 25', { exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(report.getByText('Equipamento para relatório 25', { exact: true })).toBeVisible();
});

test('report retains observations and photographic inspection evidence', async ({ page }) => {
  await seedReport(page);
  await page.goto('/app/records');
  await page.getByRole('button', { name: 'Relatório para impressão / PDF' }).click();
  const report = page.getByRole('dialog', { name: 'Prévia do relatório para impressão ou PDF' });
  await expect(report).toContainText('Observação geral que deve acompanhar o relatório.');
  await expect(report).toContainText('Evidência individual: proteção revisada no local.');
  await expect(report.locator(`img[src="${evidencePhoto}"]`)).toHaveCount(1);
});

test('draft autosave reports quota failure and can retry without losing notes', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  await failDraftWrites(page);
  const notes = page.getByLabel('Observações gerais da inspeção (opcional)');
  await notes.fill('Anotação ainda não salva com evidência em campo.');
  await expect(page.getByRole('alert').filter({ hasText: /rascunho/i })).toBeVisible();
  await expect(notes).toHaveValue('Anotação ainda não salva com evidência em campo.');
  await page.evaluate(() => {
    (window as unknown as { restoreDraftStorage: () => void }).restoreDraftStorage();
  });
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /rascunho salvo/i }).first()).toBeVisible();
  await page.reload();
  await expect(notes).toHaveValue('Anotação ainda não salva com evidência em campo.');
});

test('draft navigation can be canceled while failed writes preserve the form', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  await failDraftWrites(page);
  const notes = page.getByLabel('Observações gerais da inspeção (opcional)');
  await notes.fill('Não perder esta observação ao voltar.');
  await page.getByRole('button', { name: 'Voltar para ficha do equipamento' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Sair sem salvar o rascunho?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Continuar preenchendo' }).click();
  await expect(notes).toHaveValue('Não perder esta observação ao voltar.');
  await expect(page).toHaveURL(/\/a\/eq-001\/inspect$/);
});

test('modal confirmation contains keyboard focus and restores its trigger', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  const trigger = page.getByRole('button', { name: 'Limpar', exact: true });
  await trigger.click();
  const confirmation = page.getByRole('dialog', { name: 'Descartar rascunho da inspeção?' });
  await expect(confirmation.getByRole('button', { name: 'Continuar preenchendo' })).toBeFocused();
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press('Tab');
    expect(await confirmation.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(confirmation).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('modal record details capture focus and dismiss with Escape', async ({ page }) => {
  await page.goto('/app/records');
  const trigger = page.getByRole('button', { name: 'Ver detalhes', exact: true }).first();
  await trigger.click();
  const drawer = page.getByRole('dialog');
  expect(await drawer.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  expect(await drawer.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});
