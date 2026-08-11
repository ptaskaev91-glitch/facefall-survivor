import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
    }
  },
  webServer: {
    command: 'npm run dev:next -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/engine-lab.html',
    timeout: 30_000,
    reuseExistingServer: !process.env.CI
  }
});
