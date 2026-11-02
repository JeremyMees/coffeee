import { defineConfig, devices } from '@playwright/test'

const port = 3100

export default defineConfig({
  testDir: 'test/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node --env-file-if-exists=.env .output/server/index.mjs',
    env: {
      PORT: String(port),
      NUXT_BETTER_AUTH_SECRET: 'a-test-secret-that-is-long-enough-to-use',
      NUXT_PRODUCTION_URL: `http://localhost:${port}`,
      BLOB_READ_WRITE_TOKEN: '',
    },
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
})
