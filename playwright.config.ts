import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './frontend/tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node scripts/qa-services.mjs', url: 'http://127.0.0.1:4100/api/health', reuseExistingServer: false, timeout: 30_000 },
    { command: 'node node_modules/next/dist/bin/next start frontend --port 3100 --hostname 127.0.0.1', url: 'http://127.0.0.1:3100/login', reuseExistingServer: false, timeout: 60_000 },
  ],
});
