import { expect, test } from '@playwright/test';
import { createInitialSeedData } from '../src/data/seedData';

test('operations plan schedules the selected checklist and completes a task exactly once', async ({
  page,
}) => {
  const seed = createInitialSeedData();
  const template = seed.templates.find(
    (t) => t.id !== seed.assets.find((a) => a.id === 'eq-001')!.templateId,
  )!;
  await page.goto('/app/plans');
  await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo plano de inspeção' });
  await dialog.getByLabel('Nome do plano').fill('Ronda de teste em campo');
  await dialog.getByLabel('Modelo publicado').selectOption(template.id);
  await dialog.getByRole('checkbox', { name: /EQ-001/ }).check();
  await dialog.getByRole('button', { name: 'Criar plano e tarefas' }).click();
  const task = page.getByTestId('task-row').filter({ hasText: 'Ronda de teste em campo' }).first();
  await expect(task).toBeVisible();
  const inspectionUrl = await task
    .getByRole('link', { name: 'Iniciar inspeção' })
    .getAttribute('href');
  const previous = await page.evaluate(
    () => JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).records.length,
  );
  await task.getByRole('link', { name: 'Iniciar inspeção' }).click();
  await expect(page.getByText(template.name, { exact: false }).first()).toBeVisible();
  for (const button of await page.getByRole('button', { name: 'Conforme', exact: true }).all())
    await button.click();
  for (const number of await page.getByLabel(/Leitura numérica/).all()) await number.fill('12,5');
  await page.getByRole('button', { name: 'Finalizar inspeção' }).click();
  await expect(page.getByRole('heading', { name: 'Inspeção finalizada' })).toBeVisible();
  await page.goto(inspectionUrl!);
  await expect(page.getByRole('heading', { name: 'Tarefa já concluída' })).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!),
  );
  expect(stored.records).toHaveLength(previous + 1);
  expect(stored.records[0].templateId).toBe(template.id);
  expect(
    stored.tasks.find((task: { id: string }) => task.id === stored.records[0].taskId).status,
  ).toBe('completed');
  await page.goto('/app/plans');
  await expect(task).toContainText('Concluída');
});

test('operations legacy browser saves keep equipment edits when new collections are absent', async ({
  page,
}) => {
  const old = {
    ...createInitialSeedData(),
    plans: undefined,
    tasks: undefined,
    templateDrafts: undefined,
  };
  old.assets = old.assets.map((asset, index) =>
    index === 0 ? { ...asset, name: 'Equipamento preservado da versão anterior' } : asset,
  );
  await page.addInitScript((state) => {
    if (!localStorage.getItem('ativos_demo_state_v1'))
      localStorage.setItem('ativos_demo_state_v1', JSON.stringify(state));
  }, old);
  await page.goto('/app/plans');
  await expect(page.getByRole('heading', { name: 'Planos e tarefas' })).toBeVisible();
  await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: /Equipamento preservado da versão anterior/ }),
  ).toBeVisible();
});

test('operations QR request flows through assignment treatment return and approval', async ({
  page,
}) => {
  await page.goto('/a/eq-001');
  await page.getByRole('link', { name: 'Solicitar manutenção', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Solicitar manutenção', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Título da solicitação').fill('Ruído no compressor da linha');
  await page
    .getByLabel('Descreva o problema')
    .fill('O compressor apresenta ruído ao iniciar e precisa de avaliação.');
  await page.getByLabel('Seu nome (opcional)').fill('João da produção');
  await page.getByRole('button', { name: 'Enviar solicitação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Solicitação registrada' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver solicitação no painel' }).click();
  const detail = page.getByRole('dialog', { name: 'Ruído no compressor da linha' });
  await expect(detail).toBeVisible();
  await detail.getByLabel('Responsável pelo atendimento').selectOption({ index: 1 });
  await detail.getByRole('button', { name: 'Salvar atribuição', exact: true }).click();
  await detail.getByRole('button', { name: 'Iniciar atendimento', exact: true }).click();
  await detail
    .getByLabel('Resultado do tratamento e ação corretiva *')
    .fill('Rolamento substituído e vibração verificada.');
  await detail
    .locator('input[type="file"]')
    .setInputFiles({
      name: 'reparo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  await expect(detail.getByRole('img', { name: 'Foto do tratamento' })).toBeVisible();
  await detail.getByRole('button', { name: 'Enviar para verificação', exact: true }).click();
  await expect(detail.getByText('Aguardando verificação', { exact: true }).first()).toBeVisible();
  await detail
    .getByLabel('Observações da verificação')
    .fill('Testar novamente com o equipamento em carga.');
  await detail.getByRole('button', { name: 'Devolver para ajuste', exact: true }).click();
  await expect(detail.getByText('Devolvida para ajuste', { exact: true })).toBeVisible();
  await detail.getByRole('button', { name: 'Enviar para verificação', exact: true }).click();
  await detail
    .getByLabel('Observações da verificação')
    .fill('Teste concluído e operação liberada.');
  await detail.getByRole('button', { name: 'Aprovar e concluir', exact: true }).click();
  await expect(
    detail.getByText('Tratamento aprovado e ordem concluída', { exact: true }),
  ).toBeVisible();
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).issues.find(
      (i: { title: string }) => i.title === 'Ruído no compressor da linha',
    ),
  );
  expect(saved.inspectionId).toBeUndefined();
  expect(saved.status).toBe('resolved');
  expect(saved.treatmentPhotoDataUrl).toContain('data:image/jpeg');
  expect(
    saved.timeline.some((event: { label: string }) => event.label === 'Devolvida para ajuste'),
  ).toBe(true);
});

test('operations repair save failure retains input and can retry', async ({ page }) => {
  await page.goto('/a/eq-001/request');
  await expect(
    page.getByRole('heading', { name: 'Solicitar manutenção', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Título da solicitação').fill('Solicitação que precisa ser preservada');
  await page
    .getByLabel('Descreva o problema')
    .fill('Não perder esta descrição se o armazenamento falhar.');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreWrites: () => void }).restoreWrites = () => {
      Storage.prototype.setItem = original;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'ativos_demo_state_v1') throw new DOMException('Quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Enviar solicitação', exact: true }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByLabel('Descreva o problema')).toHaveValue(
    'Não perder esta descrição se o armazenamento falhar.',
  );
  await page.evaluate(() => (window as unknown as { restoreWrites: () => void }).restoreWrites());
  await page.getByRole('button', { name: 'Enviar solicitação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Solicitação registrada' })).toBeVisible();
});

test('operations template draft stays separate from the published checklist and historical snapshots', async ({
  page,
}) => {
  const seed = createInitialSeedData();
  const template = seed.templates.find(
    (t) => t.id === seed.assets.find((a) => a.id === 'eq-001')!.templateId,
  )!;
  await page.goto(`/app/templates?templateId=${template.id}`);
  await expect(
    page.getByRole('button', { name: 'Salvar rascunho do modelo', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Pergunta 1', { exact: true }).fill('Pergunta que ainda não foi publicada');
  await page.getByRole('button', { name: 'Salvar rascunho do modelo', exact: true }).click();
  await page.goto('/a/eq-001/inspect');
  await expect(page.getByText('Pergunta que ainda não foi publicada', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText(template.items[0].label, { exact: false }).first()).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!),
  );
  expect(
    stored.templateDrafts.find((t: { id: string }) => t.id === template.id).items[0].label,
  ).toBe('Pergunta que ainda não foi publicada');
  expect(stored.templates.find((t: { id: string }) => t.id === template.id).items[0].label).toBe(
    template.items[0].label,
  );
  expect(stored.records[0].answers).toEqual(seed.records[0].answers);
});

test('operations template creates publishes previews conditional fields and enforces numeric limits', async ({
  page,
}) => {
  await page.goto('/app/templates');
  await expect(page.getByRole('button', { name: 'Novo modelo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Novo modelo', exact: true }).click();
  await page.getByLabel('Nome do modelo', { exact: true }).fill('Modelo condicional em campo');
  await page.getByLabel('Pergunta 1', { exact: true }).fill('Tipo de atendimento');
  await page.getByLabel('Tipo da pergunta 1').selectOption('single_choice');
  await page.getByLabel('Opções da pergunta 1').fill('Rotina\nFalha');
  await page.getByRole('button', { name: 'Adicionar pergunta', exact: true }).click();
  await page.getByLabel('Pergunta 2', { exact: true }).fill('Temperatura do equipamento');
  await page.getByLabel('Tipo da pergunta 2').selectOption('number');
  await page.getByLabel('Unidade da pergunta 2').fill('°C');
  await page.getByLabel('Mínimo da pergunta 2').fill('0');
  await page.getByLabel('Máximo da pergunta 2').fill('10');
  await page.getByLabel('Exibir pergunta 2').selectOption({ index: 1 });
  await page.getByLabel('Resposta que exibe a pergunta 2').selectOption('Falha');
  await page.getByRole('button', { name: 'Salvar rascunho do modelo', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Nome do modelo', { exact: true })).toHaveValue(
    'Modelo condicional em campo',
  );
  await page.getByRole('button', { name: 'Prévia no celular', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Prévia no celular' });
  await preview.getByLabel('Tipo de atendimento').selectOption('Rotina');
  await expect(preview.getByRole('textbox', { name: /Leitura numérica/ })).toHaveCount(0);
  await preview.getByLabel('Tipo de atendimento').selectOption('Falha');
  await preview.getByRole('textbox', { name: /Leitura numérica/ }).fill('12,5');
  await expect(preview.getByLabel('Descrição da não conformidade *')).toBeVisible();
  await preview.getByRole('button', { name: 'Fechar painel', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar modelo', exact: true }).click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!),
  );
  const published = state.templates.find(
    (t: { name: string }) => t.name === 'Modelo condicional em campo',
  );
  expect(published.version).toBe(1);
  expect(state.templateDrafts.some((t: { id: string }) => t.id === published.id)).toBe(false);
  await page.getByLabel('Categoria de destino').selectOption('Climatização');
  await page.getByRole('button', { name: 'Aplicar aos equipamentos', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar aplicação', exact: true })
    .click();
  await page.goto('/a/eq-001/inspect');
  await page.getByLabel('Tipo de atendimento').selectOption('Rotina');
  await page.getByRole('button', { name: 'Finalizar inspeção', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inspeção finalizada' })).toBeVisible();
  const record = await page.evaluate(
    () => JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).records[0],
  );
  expect(record.answers).toHaveLength(1);
  expect(record.answers[0].value).toBe('Rotina');
  expect(record.templateVersion).toBe(1);
  await page.getByRole('link', { name: 'Ver registro completo' }).click();
  await expect(page.getByRole('dialog')).toContainText('Rotina');
});

test('operations scheduled drafts are isolated from each other and an ad hoc inspection', async ({
  page,
}) => {
  await page.goto('/a/eq-001/inspect');
  const notes = page.getByLabel('Observações gerais da inspeção (opcional)');
  const saved = () =>
    page
      .getByRole('status')
      .filter({ hasText: /rascunho salvo/i })
      .first();
  await notes.fill('Rascunho avulso do equipamento.');
  await expect(saved()).toBeVisible();
  const tasks = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!)
      .tasks.filter((task: { assetId: string }) => task.assetId === 'eq-001')
      .slice(0, 2),
  );
  await page.goto(`/a/eq-001/inspect?taskId=${encodeURIComponent(tasks[0].id)}`);
  await expect(notes).toHaveValue('');
  await notes.fill('Rascunho da primeira execução.');
  await expect(saved()).toBeVisible();
  await page.goto(`/a/eq-001/inspect?taskId=${encodeURIComponent(tasks[1].id)}`);
  await expect(notes).toHaveValue('');
  await notes.fill('Rascunho da segunda execução.');
  await expect(saved()).toBeVisible();
  await page.goto(`/a/eq-001/inspect?taskId=${encodeURIComponent(tasks[0].id)}`);
  await expect(notes).toHaveValue('Rascunho da primeira execução.');
  await page.goto('/a/eq-001/inspect');
  await expect(notes).toHaveValue('Rascunho avulso do equipamento.');
});

test('operations pending verification stays unresolved and failed approval does not advance it', async ({
  page,
}) => {
  const seed = createInitialSeedData();
  const issue = seed.issues.find((issue) => issue.status === 'open')!;
  issue.status = 'awaiting_review';
  issue.resolutionNote = 'Reparo pronto para avaliação.';
  await page.addInitScript((state) => {
    if (!localStorage.getItem('ativos_demo_state_v1'))
      localStorage.setItem('ativos_demo_state_v1', JSON.stringify(state));
  }, seed);
  await page.goto(`/app/issues?issueId=${issue.id}`);
  const detail = page.getByRole('dialog');
  await detail.getByLabel('Observações da verificação').fill('Confirmado no local.');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota', 'QuotaExceededError');
    };
  });
  await detail.getByRole('button', { name: 'Aprovar e concluir', exact: true }).click();
  await expect(detail.getByRole('alert')).toBeVisible();
  await expect(detail.getByLabel('Observações da verificação')).toHaveValue('Confirmado no local.');
  expect(
    await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).issues.find(
          (issue: { id: string }) => issue.id === id,
        ).status,
      issue.id,
    ),
  ).toBe('awaiting_review');
  await page.reload();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Fechar painel', exact: true })
    .click();
  await expect(
    page.getByTestId('work-order').filter({ hasText: issue.title }).first(),
  ).toBeVisible();
  await page.goto('/app/records');
  await page.getByRole('button', { name: 'Relatório para impressão / PDF' }).click();
  await expect(
    page
      .getByRole('dialog')
      .locator('div.report-answer')
      .filter({ hasText: issue.description })
      .first(),
  ).toContainText('Aguardando verificação');
});

test('operations viewer can inspect history but cannot change plans templates or work orders', async ({
  page,
}) => {
  await page.goto('/app');
  await page.getByLabel('Visão simulada de perfil').selectOption('viewer');
  await page.goto('/app/plans');
  // Role is held in the React app session, so use client-side links thereafter.
  await page.getByLabel('Visão simulada de perfil').selectOption('viewer');
  await expect(page.getByRole('button', { name: 'Novo plano', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Iniciar inspeção', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Modelos de inspeção', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publicar modelo', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Nome do modelo', { exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Pendências', exact: false }).first().click();
  await page.getByRole('button', { name: 'Tratar', exact: true }).first().click();
  const detail = page.getByRole('dialog');
  await expect(detail.getByRole('button', { name: 'Salvar atribuição', exact: true })).toHaveCount(
    0,
  );
  await expect(
    detail.getByRole('button', { name: 'Iniciar atendimento', exact: true }),
  ).toHaveCount(0);
  await expect(
    detail.getByText('Perfil Visualizador: consulta de detalhes e histórico.', { exact: true }),
  ).toBeVisible();
});

test('operations responsive pages fit phone tablet and desktop', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1000 });
    for (const [name, path] of [
      ['plans', '/app/plans'],
      ['orders', '/app/issues'],
      ['templates', '/app/templates'],
      ['request', '/a/eq-001/request'],
    ]) {
      await page.goto(path);
      if (name === 'orders')
        await page.getByRole('button', { name: 'Quadro', exact: true }).click();
      await expect(page.getByRole('main')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: false });
    }
  }
});
