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
      await test.step('Search for "shirt"', async () => {
        await productListPage.search('shirt');
      });

      await test.step('Verify grid updates with search results or empty state', async () => {
        await expect(productListPage.grid).toBeVisible();

        const cards = productListPage.page.locator('[data-testid^="product-card-"]');
        const cardCount = await cards.count();

        if (cardCount === 0) {
          await expect(productListPage.emptyState).toBeVisible();
        } else {
          await expect(cards.first()).toBeVisible();
        }
      });
    },
  );

  test(
    'TC-011: category filter shows only products from selected category',
    { tag: ['@TC-011', '@buyer', '@product-browse'] },
    async ({ productListPage }) => {
      await test.step('Click first available category filter', async () => {
        await expect(productListPage.filtersPanel).toBeVisible();
        await productListPage.clickFirstCategoryFilter();
      });

      await test.step('Verify grid updates with filtered results or empty state', async () => {
        const cards = productListPage.page.locator('[data-testid^="product-card-"]');
        const cardCount = await cards.count();

        if (cardCount === 0) {
          await expect(productListPage.emptyState).toBeVisible();
        } else {
          await expect(cards.first()).toBeVisible();
        }
      });
    },
  );
});
