import { defineConfig } from '@playwright/test'

const WEB = Number(process.env.E2E_WEB_PORT ?? 14173)
const API = Number(process.env.E2E_API_PORT ?? 18080)
const MOCK = Number(process.env.MOCK_AI_PORT ?? 19999)
const shutdown = { signal: 'SIGTERM' as const, timeout: 10_000 }

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${WEB}`,
    // Local runs use installed Chrome; in CI run `playwright install chromium` and set PW_CHANNEL=chromium.
    channel: process.env.PW_CHANNEL ?? 'chrome',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: [
    { command: 'node support/mock-ai.mjs', url: `http://127.0.0.1:${MOCK}/__health`, reuseExistingServer: false, gracefulShutdown: shutdown },
    // First run compiles the Rust server, hence the long timeout.
    { command: 'node support/server.mjs', url: `http://127.0.0.1:${API}/health`, timeout: 600_000, reuseExistingServer: false, gracefulShutdown: shutdown },
    {
      command: `pnpm --filter web exec vite --port ${WEB} --strictPort`,
      url: `http://localhost:${WEB}`,
      env: { OPENNOTES_API: `http://127.0.0.1:${API}` },
      reuseExistingServer: false,
      gracefulShutdown: shutdown,
    },
  ],
})
