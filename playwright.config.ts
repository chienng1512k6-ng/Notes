import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: '.playwright-results',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    viewport: { width: 1680, height: 1000 },
    reducedMotion: 'reduce',
    screenshot: 'off', video: 'off', trace: 'off',
  },
  webServer: {
    command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run start -- --port 3100 --hostname 127.0.0.1`,
    url: 'http://127.0.0.1:3100',
    timeout: 60_000,
    reuseExistingServer: false,
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  },
});
