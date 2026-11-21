import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pilot',
  outputDir: '.superpowers/pilot-test-results',
  fullyParallel: false,
  workers: 1,
  timeout: process.env.PILOT_TEST_ORIGIN ? 240_000 : 90_000,
  expect: { timeout: 12_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  webServer: process.env.PILOT_TEST_ORIGIN
    ? undefined
    : {
        command:
          'node node_modules/wrangler/bin/wrangler.js pages dev dist --port 8788 --ip 127.0.0.1',
        url: 'http://127.0.0.1:8788/api/health',
        reuseExistingServer: !process.env.CI,
        timeout: 45_000,
        env: { WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: '.superpowers/wrangler-e2e.log' },
      },
  use: {
    baseURL: process.env.PILOT_TEST_ORIGIN ?? 'http://127.0.0.1:8788',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    ...(process.env.PILOT_TEST_PROXY ? { proxy: { server: process.env.PILOT_TEST_PROXY } } : {}),
  },
});
