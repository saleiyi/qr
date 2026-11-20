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

test('report includes every filtered inspection above twenty records', async ({ page }, testInfo) => {
  await seedReport(page);
  await page.goto('/app/records');
  await page.getByRole('button', { name: 'Relatório para impressão / PDF' }).click();
  const report = page.getByRole('dialog', { name: 'Prévia do relatório para impressão ou PDF' });
  await expect(report).toContainText('Registros incluídos: 25');
  await expect(report.getByText('Equipamento para relatório 25', { exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(report.getByText('Equipamento para relatório 25', { exact: true })).toBeVisible();
  await page.pdf({
    path: testInfo.outputPath('complete-inspection-report.pdf'),
    format: 'A4',
    printBackground: true,
  });
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
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'rascunho-evidencia.png',
    mimeType: 'image/png',
    buffer: Buffer.from(evidencePhoto.split(',')[1], 'base64'),
  });
  const photo = page.getByRole('img', { name: /Evidência de/ });
  await expect(photo).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: /rascunho/i })).toBeVisible();
  await expect(notes).toHaveValue('Anotação ainda não salva com evidência em campo.');
  await page.evaluate(() => {
    (window as unknown as { restoreDraftStorage: () => void }).restoreDraftStorage();
  });
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /rascunho salvo/i }).first()).toBeVisible();
  await page.reload();
  await expect(notes).toHaveValue('Anotação ainda não salva com evidência em campo.');
  await expect(photo).toBeVisible();
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

test('draft failed saves protect input when the browser reloads', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  await failDraftWrites(page);
  const notes = page.getByLabel('Observações gerais da inspeção (opcional)');
  await notes.fill('Preservar esta evidência ao recarregar.');
  const pendingDialog = page.waitForEvent('dialog', { timeout: 5_000 });
  // A canceled reload has no load event; bound that expected pending navigation.
  const reload = page.reload({ timeout: 1_000 }).catch(() => null);
  const dialog = await pendingDialog;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(notes).toHaveValue('Preservar esta evidência ao recarregar.');
  await reload;
});

test('draft saved input leaves without a warning and can be resumed', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  const notes = page.getByLabel('Observações gerais da inspeção (opcional)');
  await notes.fill('Observação salva antes de retornar à ficha.');
  await expect(page.getByRole('status').filter({ hasText: /rascunho salvo/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Voltar para ficha do equipamento' }).click();
  await expect(page).toHaveURL(/\/a\/eq-001$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/a/eq-001/inspect');
  await expect(notes).toHaveValue('Observação salva antes de retornar à ficha.');
});

test('draft edge inspector-only changes are saved and restored', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  const inspector = page.getByLabel('Responsável pela inspeção');
  await inspector.selectOption({ index: 1 });
  const selectedInspector = await inspector.inputValue();
  await expect(page.getByRole('status').filter({ hasText: /rascunho salvo/i }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Voltar para ficha do equipamento' }).click();
  await expect(page).toHaveURL(/\/a\/eq-001$/);
  await page.goto('/a/eq-001/inspect');
  await expect(inspector).toHaveValue(selectedInspector);
});

test('draft edge reverting unsaved changes restores the saved status', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  const notes = page.getByLabel('Observações gerais da inspeção (opcional)');
  const savedStatus = page.getByRole('status').filter({ hasText: /rascunho salvo/i }).first();
  await notes.fill('Observação já salva.');
  await expect(savedStatus).toBeVisible();
  await notes.fill('Alteração temporária.');
  await expect(page.getByRole('status').filter({ hasText: 'Salvando rascunho…' })).toBeVisible();
  await notes.fill('Observação já salva.');
  await expect(savedStatus).toBeVisible();
  await failDraftWrites(page);
  await notes.fill('Alteração que falhou ao salvar.');
  await expect(page.getByRole('alert').filter({ hasText: /rascunho/i })).toBeVisible();
  await notes.fill('Observação já salva.');
  await expect(savedStatus).toBeVisible();
});

test('draft edge pending photos block incomplete saving and navigation', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  await page.getByLabel('Observações gerais da inspeção (opcional)').fill('Rascunho antes da foto.');
  await expect(page.getByRole('status').filter({ hasText: /rascunho salvo/i }).first()).toBeVisible();
  await page.evaluate(() => {
    const original = FileReader.prototype.readAsDataURL;
    const pending: Array<() => void> = [];
    FileReader.prototype.readAsDataURL = function (file) {
      pending.push(() => original.call(this, file));
    };
    (window as unknown as { finishPhotoRead: () => void }).finishPhotoRead = () => {
      FileReader.prototype.readAsDataURL = original;
      pending.forEach((read) => read());
    };
  });
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'foto-em-processamento.png',
    mimeType: 'image/png',
    buffer: Buffer.from(evidencePhoto.split(',')[1], 'base64'),
  });
  await expect(page.getByRole('button', { name: 'Salvar rascunho', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Finalizar inspeção' })).toBeDisabled();
  await page.getByRole('button', { name: 'Voltar para ficha do equipamento' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Sair sem salvar o rascunho?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Continuar preenchendo' }).click();
  await page.evaluate(() => {
    (window as unknown as { finishPhotoRead: () => void }).finishPhotoRead();
  });
  await expect(page.getByRole('img', { name: /Evidência de/ })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /rascunho salvo/i }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('img', { name: /Evidência de/ })).toBeVisible();
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

test('modal nested confirmation keeps editing intact and returns to the parent', async ({ page }) => {
  await page.goto('/app/assets');
  const trigger = page.getByRole('button', { name: 'Novo equipamento', exact: true });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Novo equipamento', exact: true });
  const name = drawer.getByLabel(/Nome do equipamento/);
  await name.fill('Equipamento com alterações pendentes');
  await drawer.getByRole('button', { name: 'Fechar painel de equipamento' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Descartar alterações não salvas?' });
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press('Tab');
    expect(await confirmation.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(confirmation).toBeHidden();
  await expect(drawer).toBeVisible();
  await expect(name).toHaveValue('Equipamento com alterações pendentes');
  await drawer.getByRole('button', { name: 'Fechar painel de equipamento' }).click();
  await confirmation.getByRole('button', { name: 'Descartar e fechar' }).click();
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('modal mobile navigation captures focus and can close with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/app');
  const trigger = page.getByRole('button', { name: 'Abrir menu de navegação' });
  await trigger.click();
  const navigation = page.getByRole('dialog', { name: 'Navegação móvel' });
  expect(await navigation.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(navigation).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('modal edge mobile navigation releases desktop controls after resize', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/app');
  await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.getByRole('link', { name: /Equipamentos/ }).first().click();
  await expect(page).toHaveURL(/\/app\/assets$/);
});

test('workflow explicit draft discard leaves without another navigation prompt', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  await page.getByLabel('Observações gerais da inspeção (opcional)').fill('Rascunho descartado por escolha explícita.');
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar rascunho', exact: true }).click();
  await expect(page).toHaveURL(/\/a\/eq-001$/);
  expect(await page.evaluate(() => localStorage.getItem('ativos_demo_draft_v1_eq-001'))).toBeNull();
  await page.goto('/a/eq-001/inspect');
  await expect(page.getByLabel('Observações gerais da inspeção (opcional)')).toHaveValue('');
});

test('workflow submits inspection evidence and records issue treatment', async ({ page }) => {
  await page.goto('/a/eq-001/inspect');
  const previousCount = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).records.length as number,
  );
  for (const answer of await page.getByRole('button', { name: 'Conforme', exact: true }).all()) {
    await answer.click();
  }
  for (const reading of await page.getByLabel(/Leitura numérica/).all()) await reading.fill('12,5');
  await page.getByRole('button', { name: 'Não conforme', exact: true }).first().click();
  await page.getByLabel('Descrição da não conformidade *').fill('Filtro de teste saturado. Trocar antes da próxima operação.');
  const photo = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#176B5B';
    context.fillRect(0, 0, 96, 64);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'filtro-inspecionado.png',
    mimeType: 'image/png',
    buffer: Buffer.from(photo, 'base64'),
  });
  await expect(page.getByRole('img', { name: /Evidência de/ })).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar inspeção' }).click();
  await expect(page.getByRole('heading', { name: 'Inspeção finalizada' })).toBeVisible();
  const submitted = await page.evaluate(() => JSON.parse(localStorage.getItem('ativos_demo_state_v1')!));
  expect(submitted.records).toHaveLength(previousCount + 1);
  expect(submitted.records[0].assetId).toBe('eq-001');
  expect(submitted.records[0].answers[0].photoDataUrl).toContain('data:image/jpeg');
  const issueId = submitted.issues[0].id;
  expect(submitted.issues[0].inspectionId).toBe(submitted.records[0].id);
  await page.getByRole('link', { name: 'Ver pendências geradas' }).click();
  await page.getByRole('searchbox', { name: 'Buscar pendências' }).fill('Filtro de teste saturado.');
  await page.getByRole('button', { name: 'Tratar', exact: true }).click();
  const issue = page.getByRole('dialog');
  await issue.getByLabel('Resultado do tratamento e ação corretiva *').fill('Filtro substituído e operação verificada no local.');
  await issue.getByRole('button', { name: 'Concluir e fechar pendência' }).click();
  const resolved = await page.evaluate((id) => {
    const state = JSON.parse(localStorage.getItem('ativos_demo_state_v1')!);
    return state.issues.find((item: { id: string }) => item.id === id);
  }, issueId);
  expect(resolved.status).toBe('resolved');
  expect(resolved.resolutionNote).toBe('Filtro substituído e operação verificada no local.');
});

test('responsive primary views fit phone tablet and desktop screens', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
    for (const [name, route] of [
      ['assets', '/app/assets'],
      ['asset-detail', '/app/assets/eq-001'],
      ['inspection', '/a/eq-001/inspect'],
    ]) {
      await page.goto(route);
      await expect(page.getByRole('main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
    }
  }
});
