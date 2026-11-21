import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(
  readFileSync(process.env.PILOT_TEST_FIXTURE ?? '.superpowers/pilot-e2e-fixture.json', 'utf8'),
);
const evidence =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';

async function activate(page: Page, url: string) {
  await page.goto(url);
  await page.getByLabel('Crie sua senha', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Ativar meu acesso', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'O que precisa de atenção hoje' })).toBeVisible();
}

test('desktop creates a real asset, independent phone submits evidence, and management receives the record', async ({
  page,
  browser,
}, testInfo) => {
  const phoneContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const otherContext = await browser.newContext();
  const anonymousContext = await browser.newContext();
  try {
    await activate(page, fixture.primary.invitationUrl);
    await expect(page.getByText('Nenhum equipamento cadastrado no momento')).toBeVisible();
    await page.goto('/app/settings');
    await expect(page.getByText('Dados da empresa (Demonstração)', { exact: true })).toHaveCount(0);
    await page.getByLabel('Nome do novo membro', { exact: true }).fill('Operadora de campo');
    await page.getByLabel('E-mail do novo membro', { exact: true }).fill(fixture.operatorEmail);
    await page.getByRole('button', { name: 'Criar convite', exact: true }).click();
    const invitation = page.locator('input[readonly]');
    await expect(invitation).toHaveValue(/\/activate#/);
    const phone = await phoneContext.newPage();
    await activate(phone, await invitation.inputValue());

    await page.goto('/app/assets');
    await expect(
      page.getByRole('button', { name: 'Novo equipamento', exact: true }).first(),
    ).toBeVisible();
    let releaseRead!: () => void;
    let readHeld = false;
    let readReleased = false;
    const gate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    await page.route('**/api/workspace', async (route) => {
      if (readHeld) return route.continue();
      readHeld = true;
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
      readReleased = true;
    });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => readHeld).toBe(true);
    await page.getByRole('button', { name: 'Novo equipamento', exact: true }).first().click();
    const drawer = page.getByRole('dialog', { name: 'Novo equipamento', exact: true });
    await drawer
      .getByLabel('Nome do equipamento *', { exact: true })
      .fill(`Bomba piloto ${fixture.suffix}`);
    const operatorOption = await drawer
      .locator('#asset-assignee option')
      .filter({ hasText: 'Operadora de campo' })
      .getAttribute('value');
    await drawer.locator('#asset-assignee').selectOption(operatorOption!);
    await drawer.getByRole('button', { name: 'Cadastrar equipamento', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    releaseRead();
    await expect.poll(() => readReleased).toBe(true);
    await expect(
      page.getByText(`Bomba piloto ${fixture.suffix}`, { exact: true }).first(),
    ).toBeVisible();
    await page.unroute('**/api/workspace');
    const stateResponse = await page.request.get('/api/workspace');
    expect(stateResponse.status()).toBe(200);
    const state = await stateResponse.json();
    expect(state.state.assets).toHaveLength(1);
    const asset = state.state.assets[0];
    await page.goto(`/app/assets/${asset.id}`);
    const scanLink = page.getByRole('link', { name: 'Abrir página do QR Code', exact: true });
    await expect(scanLink).toHaveAttribute('href', `/a/${asset.id}`);
    const scanURL = new URL((await scanLink.getAttribute('href'))!, fixture.origin).href;
    await phone.goto(scanURL);
    await expect(phone.getByRole('heading', { name: asset.name, exact: true })).toBeVisible();
    await expect(phone.getByText('Visualização simulada de perfil:', { exact: true })).toHaveCount(
      0,
    );
    await phone.getByRole('link', { name: 'Iniciar inspeção', exact: true }).last().click();
    await expect(phone.getByLabel('Responsável pela inspeção', { exact: true })).toBeDisabled();
    await phone.getByRole('button', { name: 'Conforme', exact: true }).click();
    await phone
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'evidencia.png',
        mimeType: 'image/png',
        buffer: Buffer.from(evidence, 'base64'),
      });
    await expect(phone.getByRole('img', { name: /Evidência de/ })).toBeVisible();
    await phone
      .getByLabel('Observações gerais da inspeção (opcional)', { exact: true })
      .fill(`Registro enviado pelo celular ${fixture.suffix}`);
    await phone.getByRole('button', { name: 'Finalizar inspeção', exact: true }).click();
    await expect(
      phone.getByRole('heading', { name: 'Inspeção finalizada', exact: true }),
    ).toBeVisible();
    await phone.screenshot({
      path: testInfo.outputPath('phone-inspection-confirmed.png'),
      fullPage: true,
    });

    await page.goto('/app/records');
    await expect(page.getByText(asset.name, { exact: true }).first()).toBeVisible();
    const updated = await (await page.request.get('/api/workspace')).json();
    expect(updated.state.records).toHaveLength(1);
    const record = updated.state.records[0];
    expect(record.inspectorNameSnapshot).toBe('Operadora de campo');
    expect(record.generalNotes).toContain(fixture.suffix);
    expect(Date.now() - new Date(record.submittedAt).getTime()).toBeLessThan(180_000);
    const photoURL = record.answers[0].photoDataUrl;
    expect(photoURL).toMatch(/^\/api\/files\//);
    const photo = await page.request.get(photoURL);
    expect(photo.status()).toBe(200);
    expect((await photo.body()).byteLength).toBeGreaterThan(10);
    await page.screenshot({
      path: testInfo.outputPath('desktop-record-received.png'),
      fullPage: true,
    });

    const other = await otherContext.newPage();
    await activate(other, fixture.other.invitationUrl);
    await other.goto(scanURL);
    await expect(
      other.getByRole('heading', { name: 'Equipamento não encontrado', exact: true }),
    ).toBeVisible();
    expect((await other.request.get(photoURL)).status()).toBe(404);
    const anonymous = await anonymousContext.newPage();
    await anonymous.goto(scanURL);
    await expect(anonymous).toHaveURL(
      new RegExp(`/login\\?returnTo=${encodeURIComponent(`/a/${asset.id}`)}`),
    );
    expect((await anonymous.request.get('/api/workspace')).status()).toBe(401);
    expect((await anonymous.request.get(photoURL)).status()).toBe(401);
    await anonymous.goto('/demo/app');
    await expect(
      anonymous.getByRole('heading', { name: 'O que precisa de atenção hoje' }),
    ).toBeVisible();
    expect((await anonymous.request.get('/api/workspace')).status()).toBe(401);
  } finally {
    await phoneContext.close();
    await otherContext.close();
    await anonymousContext.close();
  }
});
