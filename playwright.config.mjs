import { defineConfig } from '@playwright/test';
const development = process.env.KALM_TEST_SERVER === 'dev';
const port = Number(process.env.KALM_TEST_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  workers: 2,
  use: { baseURL, browserName: 'chromium',
    launchOptions: { executablePath: process.env.KALM_TEST_BROWSER_EXECUTABLE },
    channel: process.env.KALM_TEST_BROWSER_CHANNEL, trace: 'retain-on-failure' },
  webServer: {
    command: development ? `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`
      : `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL, reuseExistingServer: !process.env.CI,
  },
});
