import { expect, test, type Page } from '@playwright/test';

async function answerInspection(page: Page, notes: string) {
  for (const button of await page.getByRole('button', { name: 'Conforme', exact: true }).all())
    await button.click();
  for (const input of await page.getByLabel(/Leitura numérica/).all()) await input.fill('12,5');
  await page.getByLabel('Observações gerais da inspeção (opcional)').fill(notes);
}

test('review two tabs complete one task once without replacing its first record', async ({
  page,
  context,
}) => {
  await page.goto('/app/plans');
  const task = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).tasks.find(
      (t: { assetId: string }) => t.assetId === 'eq-001',
    ),
  );
  const url = `/a/eq-001/inspect?taskId=${encodeURIComponent(task.id)}`;
  await page.goto(url);
  const other = await context.newPage();
  await other.goto(url);
  await answerInspection(page, 'Primeiro atendimento preservado.');
  await answerInspection(other, 'Segundo preenchimento não substitui o primeiro.');
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).records.length,
  );
  await page.getByRole('button', { name: 'Finalizar inspeção' }).click();
  await expect(page.getByRole('heading', { name: 'Inspeção finalizada' })).toBeVisible();
  await other.getByRole('button', { name: 'Finalizar inspeção' }).click();
  await expect(other.getByRole('heading', { name: 'Tarefa já concluída' })).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!),
  );
  expect(state.records).toHaveLength(before + 1);
  expect(state.records[0].generalNotes).toBe('Primeiro atendimento preservado.');
});

test('review a stale inspection tab preserves an unrelated request from another tab', async ({
  page,
  context,
}) => {
  await page.goto('/a/eq-001/inspect');
  await answerInspection(page, 'Inspeção sem apagar a solicitação criada em outra aba.');
  const other = await context.newPage();
  await other.goto('/a/eq-002/request');
  await other.getByLabel('Título da solicitação').fill('Solicitação de outra aba');
  await other
    .getByLabel('Descreva o problema')
    .fill('Esta ocorrência precisa continuar no histórico.');
  await other.getByRole('button', { name: 'Enviar solicitação' }).click();
  await expect(other.getByRole('heading', { name: 'Solicitação registrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar inspeção' }).click();
  await expect(page.getByRole('heading', { name: 'Inspeção finalizada' })).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).issues.some(
        (issue: { title: string }) => issue.title === 'Solicitação de outra aba',
      ),
    ),
  ).toBe(true);
});

test('review a revised published question requires a new answer and preserves the old draft', async ({
  page,
}) => {
  await page.goto('/a/eq-001/inspect');
  await page.getByRole('button', { name: 'Conforme', exact: true }).first().click();
  await page
    .getByLabel('Observações gerais da inspeção (opcional)')
    .fill('Observação do formulário anterior.');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /rascunho salvo/i })
      .first(),
  ).toBeVisible();
  const templateId = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).assets.find(
        (asset: { id: string }) => asset.id === 'eq-001',
      ).templateId,
  );
  await page.goto(`/app/templates?templateId=${templateId}`);
  await page
    .getByLabel('Pergunta 1', { exact: true })
    .fill('Pergunta nova que precisa ser respondida');
  await page.getByRole('button', { name: 'Publicar modelo', exact: true }).click();
  await page.goto('/a/eq-001/inspect');
  const question = page.getByRole('group', {
    name: 'Resultado para Pergunta nova que precisa ser respondida',
  });
  await expect(question.getByRole('button', { name: 'Conforme', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(
    page.getByRole('button', { name: /Baixar rascunho anterior/ }).first(),
  ).toBeVisible();
  await expect(page.getByLabel('Observações gerais da inspeção (opcional)')).toHaveValue(
    'Observação do formulário anterior.',
  );
});

test('review publication in another tab cannot certify an outdated open form', async ({
  page,
  context,
}) => {
  await page.goto('/a/eq-001/inspect');
  await answerInspection(page, 'Respostas da versão anterior.');
  const templateId = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('ativos_demo_state_v1')!).assets.find(
        (asset: { id: string }) => asset.id === 'eq-001',
      ).templateId,
  );
  const other = await context.newPage();
  await other.goto(`/app/templates?templateId=${templateId}`);
  await other
    .getByLabel('Pergunta 1', { exact: true })
    .fill('Pergunta publicada enquanto o formulário estava aberto');
  await other.getByRole('button', { name: 'Publicar modelo', exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar inspeção' }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: /modelo|versão/i })
      .first(),
  ).toBeVisible();
  await expect(page.getByLabel('Observações gerais da inspeção (opcional)')).toHaveValue(
    'Respostas da versão anterior.',
  );
});

test('review viewer scheduled links stay read only and preserve the operator draft', async ({
  page,
}) => {
  await page.goto('/app/plans');
  await page
    .getByTestId('task-row')
    .filter({ hasText: 'EQ-001' })
    .getByRole('link', { name: 'Iniciar inspeção' })
    .first()
    .click();
  await page
    .getByLabel('Observações gerais da inspeção (opcional)')
    .fill('Rascunho exclusivo da operação.');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /rascunho salvo/i })
      .first(),
  ).toBeVisible();
  const before = await page.evaluate(() =>
    Object.entries(localStorage).filter(([key]) => key.startsWith('ativos_demo_draft_v1_')),
  );
  await page.getByRole('button', { name: 'Voltar para ficha do equipamento' }).click();
  await page.getByRole('link', { name: 'Ver agenda completa' }).click();
  await page.getByLabel('Visão simulada de perfil').selectOption('viewer');
  await page.getByRole('link', { name: /Abrir ficha móvel/ }).click();
  await page
    .getByRole('link', { name: /Consultar na agenda/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Planos e tarefas' })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Object.entries(localStorage).filter(([key]) => key.startsWith('ativos_demo_draft_v1_')),
    ),
  ).toEqual(before);
});

test('review backdated plans materialize current work before and after reload', async ({
  page,
}) => {
  await page.goto('/app/plans');
  await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo plano de inspeção' });
  await dialog.getByLabel('Nome do plano').fill('Plano retroativo da operação');
  await dialog.getByLabel('Primeira inspeção').fill('2026-07-01');
  await dialog.getByLabel('Frequência').selectOption('daily');
  await dialog.getByRole('checkbox', { name: /EQ-001/ }).check();
  await dialog.getByRole('button', { name: 'Criar plano e tarefas' }).click();
  await page.getByRole('button', { name: 'Próximos 7 dias', exact: true }).click();
  await expect(
    page
      .getByTestId('task-row')
      .filter({ hasText: 'Plano retroativo da operação' })
      .filter({ hasText: '20/11/2026' }),
  ).toBeVisible();
  const ids = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ativos_demo_state_v1')!)
      .tasks.filter(
        (task: { planName: string }) => task.planName === 'Plano retroativo da operação',
      )
      .map((task: { id: string }) => task.id),
  );
  await page.reload();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ativos_demo_state_v1')!)
        .tasks.filter(
          (task: { planName: string }) => task.planName === 'Plano retroativo da operação',
        )
        .map((task: { id: string }) => task.id),
    ),
  ).toEqual(ids);
});

test('review failed plan save survives browser Back and permits explicit discard', async ({
  page,
}) => {
  await page.goto('/app');
  await page.getByRole('link', { name: 'Planos e tarefas', exact: true }).click();
  await page.getByRole('button', { name: 'Novo plano', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo plano de inspeção' });
  await dialog.getByLabel('Nome do plano').fill('Plano que não pode desaparecer');
  await dialog.getByRole('checkbox', { name: /EQ-001/ }).check();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota', 'QuotaExceededError');
    };
  });
  await dialog.getByRole('button', { name: 'Criar plano e tarefas' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await page.evaluate(() => history.back());
  const confirmation = page.getByRole('dialog', { name: 'Descartar este plano?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Continuar preenchendo' }).click();
  await expect(dialog.getByLabel('Nome do plano')).toHaveValue('Plano que não pode desaparecer');
  await page.evaluate(() => history.back());
  await confirmation.getByRole('button', { name: 'Descartar plano' }).click();
  await expect(page).toHaveURL(/\/app$/);
});
