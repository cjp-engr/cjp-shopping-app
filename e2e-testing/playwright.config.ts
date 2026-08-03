import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['line']],
  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        baseURL: API_URL,
      },
    },
    {
      name: 'web',
      testMatch: /tests\/web\/.*\.spec\.ts/,
      use: {
        baseURL: WEB_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        channel: 'chrome',
      },
    },
  ],
});
