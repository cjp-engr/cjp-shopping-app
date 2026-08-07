import { test, expect } from '../../../fixtures/base-fixture';

// TC coverage: TC-001 — successful login (S1 partial)
test.describe('Web login', () => {
  test(
    'TC-001: buyer can log in and see authenticated navbar',
    { tag: ['@TC-001', '@buyer', '@auth', '@smoke'] },
    async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAsBuyer();
    await expect(page.getByTestId('user-menu-btn')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('nav-signin-link')).not.toBeVisible();
  });
});
