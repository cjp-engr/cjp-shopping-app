// Smoke test: proves switchRole applies the correct auth state for each role.
// Not a business-flow test — delete or replace once real mixed tests exist.

import { test, expect } from '../../../fixtures/base-fixture';

test('switchRole: applies buyer then seller auth state', async ({
  page,
  switchRole,
}) => {
  await switchRole('buyer');
  await page.goto('/');
  await expect(page.getByTestId('user-menu-btn')).toBeVisible({ timeout: 10_000 });
  const buyerData = await page.evaluate(() =>
    localStorage.getItem('shopping_app_user_data'),
  );
  const buyer = JSON.parse(buyerData!);
  expect(buyer.role).toBe('buyer');

  await switchRole('seller');
  await expect(page.getByTestId('user-menu-btn')).toBeVisible({ timeout: 10_000 });
  const sellerData = await page.evaluate(() =>
    localStorage.getItem('shopping_app_user_data'),
  );
  const seller = JSON.parse(sellerData!);
  expect(seller.role).toBe('seller');
});
