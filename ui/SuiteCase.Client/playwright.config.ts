import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e-testing',
  fullyParallel: true,
  globalSetup: './e2e-testing/global-setup.ts',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
