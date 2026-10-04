import { defineConfig } from '@playwright/test';
const development = process.env.KALM_TEST_SERVER === 'dev';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: development ? 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort'
      : 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI,
  },
});
