import { test, expect } from '@playwright/test';
import { TEST_EMAIL, TEST_PASSWORD } from '../../helpers/api-client';

// TC coverage: S1 partial — web login (extend toward full checkout smoke)
test.describe('Web login', () => {
  test('buyer can log in and reach products page', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-form').waitFor();
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('products-page')).toBeVisible({ timeout: 15_000 });
  });
});
