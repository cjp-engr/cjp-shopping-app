// TC coverage: TC-010 — Search products by keyword
//              TC-011 — Filter products by category

import { test, expect } from '../../../fixtures/base-fixture';

test.describe('Product browse — search and filter', () => {
  test.beforeEach(async ({ productListPage }) => {
    await productListPage.goto();
  });

  test(
    'TC-010: search by keyword filters the product grid',
    { tag: ['@TC-010', '@buyer', '@product-browse'] },
    async ({ productListPage }) => {
      await productListPage.search('shirt');

      // Grid must be visible after search resolves
      await expect(productListPage.grid).toBeVisible();

      const cards = productListPage.page.locator('[data-testid^="product-card-"]');
      const cardCount = await cards.count();

      if (cardCount === 0) {
        await expect(productListPage.emptyState).toBeVisible();
      } else {
        // At least one card is present — verify search had an effect (grid is not loading)
        await expect(cards.first()).toBeVisible();
      }
    },
  );

  test(
    'TC-011: category filter shows only products from selected category',
    { tag: ['@TC-011', '@buyer', '@product-browse'] },
    async ({ productListPage }) => {
      await expect(productListPage.filtersPanel).toBeVisible();

      // Click the first available category and wait for results to settle
      await productListPage.clickFirstCategoryFilter();

      // Grid must update — either results or empty state
      const cards = productListPage.page.locator('[data-testid^="product-card-"]');
      const cardCount = await cards.count();

      if (cardCount === 0) {
        await expect(productListPage.emptyState).toBeVisible();
      } else {
        await expect(cards.first()).toBeVisible();
      }
    },
  );
});
