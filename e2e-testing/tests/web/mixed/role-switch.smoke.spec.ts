// Smoke test: proves switchRole applies the correct auth state for each role.
// Not a business-flow test — delete or replace once real mixed tests exist.
//
// Note: role assertions use email (immutable) rather than role field —
// the buyer account (b1@test.com) may be promoted to seller by other
// tests and cannot be demoted, so role field is not a reliable assertion.

import { test, expect } from '../../../fixtures/base-fixture';

test(
  'switchRole: applies buyer then seller auth state',
  { tag: ['@mixed', '@auth', '@smoke'] },
  async ({ page, switchRole }) => {
    await test.step('Apply buyer auth and verify buyer email in localStorage', async () => {
      await page.goto('/');
      await switchRole('buyer');
      await expect(page.getByTestId('user-menu-btn')).toBeVisible({ timeout: 10_000 });
      const buyerData = await page.evaluate(() =>
        localStorage.getItem('shopping_app_user_data'),
      );
      const buyer = JSON.parse(buyerData!);
      expect(buyer.email).toBe('b1@test.com');
    });

    await test.step('Apply seller auth and verify seller email in localStorage', async () => {
      await switchRole('seller');
      await expect(page.getByTestId('user-menu-btn')).toBeVisible({ timeout: 10_000 });
      const sellerData = await page.evaluate(() =>
        localStorage.getItem('shopping_app_user_data'),
      );
      const seller = JSON.parse(sellerData!);
      expect(seller.email).toBe('s1@ex.com');
    });
  },
);
