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
      await test.step('Navigate to products page as guest', async () => {
        await productListPage.goto();
        await expect(page.getByTestId('products-page')).toBeVisible();
        await expect(page.getByTestId('nav-signin-link')).toBeVisible();
      });

      await test.step('Click first product and verify detail page is accessible', async () => {
        await expect(productListPage.grid).toBeVisible();
        await productListPage.clickFirstProduct();
        await expect(page.getByTestId('product-detail-page')).toBeVisible();
      });
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
      await test.step('Inject buyer session and navigate to product catalog', async () => {
        await productListPage.goto();
        await switchRole('buyer');
        await productListPage.goto();
      });

      await test.step('Verify seller product card is visible in catalog', async () => {
        const card = productListPage.productCard(productId);
        await expect(card).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Click product card and verify detail page with Add to Cart', async () => {
        await productListPage.productCard(productId).click();
        await expect(page.getByTestId('product-detail-page')).toBeVisible();
        await expect(page.getByTestId('add-to-cart-btn')).toBeVisible();
        await expect(page.getByTestId('product-name')).toContainText(productName);
      });
    },
  );
});
