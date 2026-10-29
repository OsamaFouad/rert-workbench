import { defineConfig } from '@playwright/test';

// Locally uses the installed Google Chrome (PW_CHANNEL=chrome by default); CI installs Playwright's Chromium.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4179',
    channel: process.env.CI ? undefined : (process.env.PW_CHANNEL ?? 'chrome'),
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  },
  webServer: {
    command: 'npx vite build && npx vite preview --port 4179 --strictPort',
    port: 4179,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
