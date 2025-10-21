import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: process.env.E2E_SKIP_SERVER
    ? undefined
    : {
        command: 'npm run preview -- --host 0.0.0.0 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI
      },
  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'Firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'WebKit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
});
