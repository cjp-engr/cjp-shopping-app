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
    // page must be on the app origin before calling switchRole
    // (switchRole uses page.evaluate to set localStorage, which is origin-specific)
    await page.goto('/');
    await switchRole('buyer');
    await expect(page.getByTestId('user-menu-btn')).toBeVisible({ timeout: 10_000 });
    const buyerData = await page.evaluate(() =>
      localStorage.getItem('shopping_app_user_data'),
    );
    const buyer = JSON.parse(buyerData!);
    expect(buyer.email).toBe('b1@test.com');

    await switchRole('seller');
    await expect(page.getByTestId('user-menu-btn')).toBeVisible({ timeout: 10_000 });
    const sellerData = await page.evaluate(() =>
      localStorage.getItem('shopping_app_user_data'),
    );
    const seller = JSON.parse(sellerData!);
    expect(seller.email).toBe('s1@example.com');
  },
);
