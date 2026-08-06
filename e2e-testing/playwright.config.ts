import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

const envDir = __dirname;
dotenv.config({ path: path.join(envDir, '.env.dev') });
dotenv.config({ path: path.join(envDir, '.env') });

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['line'], ['allure-playwright']],
  projects: [
    // ── Setup projects (serial, run once each) ──────────────────────────
    {
      name: 'buyer-setup',
      testMatch: /tests\/auth\/buyer\.setup\.ts/,
      use: { baseURL: WEB_URL, channel: 'chrome' },
    },
    {
      name: 'seller-setup',
      testMatch: /tests\/auth\/seller\.setup\.ts/,
      use: { baseURL: WEB_URL, channel: 'chrome' },
    },

    // ── Test projects ───────────────────────────────────────────────────
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.api\.spec\.ts/,
      use: { baseURL: API_URL },
    },
    {
      name: 'web-buyer',
      testMatch: /tests\/web\/buyer\/.*\.spec\.ts/,
      dependencies: ['buyer-setup'],
      use: {
        baseURL: WEB_URL,
        storageState: '.auth/buyer.json',
        channel: 'chrome',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
    {
      name: 'web-seller',
      testMatch: /tests\/web\/seller\/.*\.spec\.ts/,
      dependencies: ['seller-setup'],
      use: {
        baseURL: WEB_URL,
        storageState: '.auth/seller.json',
        channel: 'chrome',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
    {
      name: 'web-mixed',
      testMatch: /tests\/web\/mixed\/.*\.spec\.ts/,
      dependencies: ['buyer-setup', 'seller-setup'],
      use: {
        baseURL: WEB_URL,
        channel: 'chrome',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
  ],
});
