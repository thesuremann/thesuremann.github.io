import { defineConfig } from '@playwright/test';

const port = 4173;
const chromiumExecutablePath = process.env.SUDOKU_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    headless: true,
    ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {})
  },
  webServer: {
    command: 'npm run serve:dist',
    port,
    reuseExistingServer: !process.env.CI
  }
});
