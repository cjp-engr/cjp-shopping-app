// TC-042: Seller creates simple product via wizard
// TC-122: Seller views My Products list
// TC-045: Seller previews simple product as buyer via My Products
// TC-044: Seller edits simple product price and stock
// TC-046: Seller deletes simple product from dashboard

import { request as pwRequest } from '@playwright/test';

import { test, expect } from '../../../fixtures/base-fixture';
import { getSellerToken } from '../../../helpers/auth-state';
import { authHeaders } from '../../../helpers/api-client';
import { ProductWizardPage } from '../../../pages/seller-dashboard/components/product-wizard/product-wizard.page';
import { ListProductsPage } from '../../../pages/seller-dashboard/pages/my-products/list-products/list-products.page';
import { API_URL, BUYER_PAYS_SHIPPING } from '../../../helpers/test-data';

const PRODUCT_NAME = `E2E Simple Lamp ${Date.now()}`;
const PRODUCT_IMAGE_URL =
  'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400';
const PRODUCT_DESCRIPTION =
  'A beautiful E2E test lamp for home decor. Energy efficient and modern design.';
const PRODUCT_TAGS = ['lamp', 'home-decor', 'lighting'];

test.describe.serial('Seller simple product CRUD', () => {
  let productId: string;

  test.afterAll(async () => {
    if (!productId) return;
    const ctx = await pwRequest.newContext({ baseURL: API_URL });
    try {
      await ctx.delete(`/api/products/${productId}`, {
        headers: authHeaders(getSellerToken()),
      });
    } catch {
      // product already deleted by TC-046 or never created
    } finally {
      await ctx.dispose();
    }
  });

  test(
    'TC-042: seller creates simple product via wizard and verifies dashboard + detail page',
    { tag: ['@TC-042', '@seller', '@product-create', '@simple', '@smoke'] },
    async ({ page, homePage, sellerDashboardPage, productDetailPage }) => {
      await test.step('Navigate to seller dashboard', async () => {
        await page.goto('/');
        await expect(page.getByTestId('navbar')).toBeVisible();
        await homePage.navigateToSellerDashboard();
        await sellerDashboardPage.expectLoaded();
      });

      await test.step('Open product creation wizard', async () => {
        const wizard = await sellerDashboardPage.openCreateProductWizard();
        await expect(wizard.root).toBeVisible();
      });

      await test.step('Fill wizard and publish simple product', async () => {
        const wizard = new ProductWizardPage(page);
        await wizard.createSimpleProduct({
          name: PRODUCT_NAME,
          category: 'Electronics',
          brand: 'Test Brand',
          price: '29.99',
          stock: '10',
          sku: 'SKU-001',
          discount: '10',
          description: PRODUCT_DESCRIPTION,
          tags: PRODUCT_TAGS,
          imageUrl: PRODUCT_IMAGE_URL,
          shipping: BUYER_PAYS_SHIPPING,
        });
        await expect(new ProductWizardPage(page).root).not.toBeVisible();
      });

      await test.step('Capture product ID from dashboard card', async () => {
        productId = await sellerDashboardPage.getProductIdFromCard(PRODUCT_NAME);
        expect(productId).toBeTruthy();
      });

      await test.step('Verify product detail page — no variant selectors', async () => {
        await productDetailPage.goto(productId);
        await expect(page.getByTestId('product-name')).toContainText(PRODUCT_NAME);
        await productDetailPage.expectNoVariantSelectors();
      });
    },
  );

  test(
    'TC-122: seller views product list on My Products page',
    { tag: ['@TC-122', '@seller', '@product-read'] },
    async ({ page, sellerDashboardPage }) => {
      const listProductsPage = new ListProductsPage(page);

      await test.step('Navigate to My Products page', async () => {
        await page.goto('/');
        await expect(page.getByTestId('navbar')).toBeVisible();
        await sellerDashboardPage.navigateToMyProducts();
        await listProductsPage.expectLoaded();
      });

      await test.step('Verify product card is visible with correct category', async () => {
        const list = listProductsPage.listProductsSection;
        await list.expectProductVisible(productId);
        await expect(list.productCard(productId)).toContainText('Electronics');
      });
    },
  );

  test(
    'TC-045: seller previews simple product as buyer via My Products page',
    { tag: ['@TC-045', '@seller', '@product-read'] },
    async ({ page, sellerDashboardPage, productDetailPage }) => {
      const listProductsPage = new ListProductsPage(page);

      await test.step('Navigate to My Products page', async () => {
        await page.goto('/');
        await expect(page.getByTestId('navbar')).toBeVisible();
        await sellerDashboardPage.navigateToMyProducts();
        await listProductsPage.expectLoaded();
      });

      await test.step('Click product card to open buyer view', async () => {
        await listProductsPage.listProductsSection.productCard(productId).click();
      });

      await test.step('Verify product detail page loads as buyer — no variant selectors', async () => {
        await expect(page.getByTestId('product-detail-page')).toBeVisible({ timeout: 10_000 });
        await expect(page).toHaveURL(new RegExp(`/products/${productId}`));
        await productDetailPage.expectNoVariantSelectors();
      });
    },
  );

  test(
    'TC-044: seller edits simple product price and stock — changes reflected on detail page',
    { tag: ['@TC-044', '@seller', '@product-update'] },
    async ({ page, homePage, sellerDashboardPage, productDetailPage }) => {
      const NEW_PRICE = '39.99';
      const NEW_STOCK = '25';

      await test.step('Navigate to seller dashboard', async () => {
        await page.goto('/');
        await expect(page.getByTestId('navbar')).toBeVisible();
        await homePage.navigateToSellerDashboard();
        await sellerDashboardPage.expectLoaded();
      });

      await test.step('Open edit wizard for product', async () => {
        await page.getByTestId(`edit-product-${productId}`).click();
        const wizard = new ProductWizardPage(page);
        await expect(wizard.root).toBeVisible();
      });

      await test.step('Update price and stock, save changes', async () => {
        const wizard = new ProductWizardPage(page);
        await wizard.editSimpleProductPricing(NEW_PRICE, NEW_STOCK);
        await expect(wizard.root).not.toBeVisible({ timeout: 10_000 });
      });

      await test.step('Verify updated price on product detail page', async () => {
        await productDetailPage.goto(productId);
        await productDetailPage.expectDisplayedPrice(`$${NEW_PRICE}`);
      });
    },
  );

  test(
    'TC-046: seller deletes product from dashboard — product removed from dashboard',
    { tag: ['@TC-046', '@seller', '@product-delete'] },
    async ({ page, homePage, sellerDashboardPage }) => {
      const listProductsPage = new ListProductsPage(page);

      await test.step('Navigate to seller dashboard', async () => {
        await page.goto('/');
        await expect(page.getByTestId('navbar')).toBeVisible();
        await homePage.navigateToSellerDashboard();
        await sellerDashboardPage.expectLoaded();
      });

      await test.step('Verify product exists before deleting', async () => {
        await expect(page.getByTestId(`product-item-${productId}`)).toBeVisible();
      });

      await test.step('Click delete and confirm in dialog', async () => {
        await page.getByTestId(`delete-product-${productId}`).click();
        await listProductsPage.deleteProductSection.confirm();
      });

      await test.step('Verify product is removed from dashboard', async () => {
        await expect(
          page.getByTestId(`product-item-${productId}`),
        ).not.toBeVisible({ timeout: 10_000 });
      });
    },
  );
});
