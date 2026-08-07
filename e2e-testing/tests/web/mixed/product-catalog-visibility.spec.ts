// TC coverage: TC-008 — Guest can browse products without login
//              TC-065 — Buyer sees new seller listing in public catalog

import { test, expect } from '../../../fixtures/base-fixture';
import { getSellerToken } from '../../../helpers/auth-state';
import { createSimpleProduct } from '../../../helpers/product-factory';

// ──────────────────────────────────────────────────────────────────────────────
// TC-008: Guest browsing — web-mixed project has no storageState (unauthenticated)
// ──────────────────────────────────────────────────────────────────────────────

test.describe('TC-008: Guest can browse products without login', () => {
  test(
    'products page loads and a product detail is accessible without auth',
    { tag: ['@TC-008', '@guest', '@catalog', '@smoke'] },
    async ({ page, productListPage }) => {
      await productListPage.goto();

      await expect(page.getByTestId('products-page')).toBeVisible();
      await expect(page.getByTestId('nav-signin-link')).toBeVisible();

      await expect(productListPage.grid).toBeVisible();
      await productListPage.clickFirstProduct();

      await expect(page.getByTestId('product-detail-page')).toBeVisible();
    },
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// TC-065: Buyer sees seller listing in public catalog
// ──────────────────────────────────────────────────────────────────────────────

test.describe('TC-065: Buyer sees new seller listing in public catalog', () => {
  let productId: string;
  const productName = `E2E Catalog Widget ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    productId = await createSimpleProduct(request, getSellerToken(), productName);
  });

  test(
    'product created by seller is visible to buyer in the catalog',
    { tag: ['@TC-065', '@mixed', '@seller', '@catalog'] },
    async ({ page, productListPage, switchRole }) => {
      // Inject buyer session (reads .auth/buyer.json — no API call)
      await productListPage.goto();
      await switchRole('buyer');
      await productListPage.goto();

      // Product card must appear in the public catalog
      const card = productListPage.productCard(productId);
      await expect(card).toBeVisible({ timeout: 10_000 });

      await card.click();
      await expect(page.getByTestId('product-detail-page')).toBeVisible();
      await expect(page.getByTestId('add-to-cart-btn')).toBeVisible();
      await expect(page.getByTestId('product-name')).toContainText(productName);
    },
  );
});
