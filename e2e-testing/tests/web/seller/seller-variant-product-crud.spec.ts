// TC-121: Seller previews variant product as buyer via My Products page
// TC-120: Seller edits variant product — updates price, stock, and adds new option
// TC-046 (variant): Seller deletes variant product from dashboard

import { request as pwRequest } from '@playwright/test';

import { test, expect } from '../../../fixtures/base-fixture';
import { getSellerToken } from '../../../helpers/auth-state';
import { authHeaders } from '../../../helpers/api-client';
import { ProductWizardPage } from '../../../pages/seller-dashboard/components/product-wizard/product-wizard.page';
import { ListProductsPage } from '../../../pages/seller-dashboard/pages/my-products/list-products/list-products.page';
import { API_URL, TC064_SIZE_VARIANTS } from '../../../helpers/test-data';

const PRODUCT_NAME = `E2E Variant Hoodie ${Date.now()}`;

test.describe.serial('Seller variant product CRUD', () => {
  let productId: string;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext({ baseURL: API_URL });
    const res = await ctx.post('/api/products', {
      headers: authHeaders(getSellerToken()),
      data: {
        name: PRODUCT_NAME,
        description: 'E2E variant hoodie with Size options S, M, and L.',
        category: 'Clothing',
        condition: 'new',
        price: 0,
        stock: 0,
        image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
        shippingOptions: ['standard', 'express', 'pickup'],
        shippingFee: 'buyer_pays',
        shippingFeeAmounts: { standard: 10, express: 15, pickup: 5 },
        variantAttributes: [
          { name: 'Size', values: ['S', 'M', 'L'] },
        ],
        variants: [
          { attributes: { Size: 'S' }, price: 49.99, stock: 5, images: [], discount: 0 },
          { attributes: { Size: 'M' }, price: 54.99, stock: 10, images: [], discount: 0 },
          { attributes: { Size: 'L' }, price: 59.99, stock: 15, images: [], discount: 0 },
        ],
      },
    });
    expect(res.status()).toBe(201);
    productId = (await res.json()).product._id;
    await ctx.dispose();
  });

  test.afterAll(async () => {
    if (!productId) return;
    const ctx = await pwRequest.newContext({ baseURL: API_URL });
    try {
      await ctx.delete(`/api/products/${productId}`, {
        headers: authHeaders(getSellerToken()),
      });
    } catch {
      // already deleted by delete TC or never created
    } finally {
      await ctx.dispose();
    }
  });

  test(
    'TC-121: seller previews variant product as buyer via My Products page',
    { tag: ['@TC-121', '@seller', '@product-read'] },
    async ({ page, sellerDashboardPage, productDetailPage }) => {
      const listProductsPage = new ListProductsPage(page);

      await test.step('Navigate to My Products page', async () => {
        await page.goto('/');
        await expect(page.getByTestId('navbar')).toBeVisible();
        await sellerDashboardPage.navigateToMyProducts();
        await listProductsPage.expectLoaded();
      });

      await test.step('Click product card and enter buyer preview', async () => {
        await listProductsPage.listProductsSection.productCard(productId).click();
        await expect(page.getByTestId('product-detail-page')).toBeVisible({ timeout: 10_000 });
        await productDetailPage.enterBuyerPreview();
      });

      await test.step('Verify variant detail page — selectors present and price/stock updates', async () => {
        await expect(page).toHaveURL(new RegExp(`/products/${productId}`));
        for (const size of TC064_SIZE_VARIANTS.attribute.values) {
          await expect(
            page.getByTestId(`variant-value-Size-${size}`),
          ).toBeVisible();
        }
        for (const size of TC064_SIZE_VARIANTS.attribute.values as ('S' | 'M' | 'L')[]) {
          await page.getByTestId(`variant-value-Size-${size}`).click();
          await expect(page.getByTestId('product-price')).toContainText(TC064_SIZE_VARIANTS.priceBySize[size]);
          await expect(page.getByTestId('variant-stock')).toContainText(TC064_SIZE_VARIANTS.stockBySize[size]);
        }
      });
    },
  );

  test(
    'TC-120: seller edits variant product — updates price, stock, and adds new size option',
    { tag: ['@TC-120', '@seller', '@product-update'] },
    async ({ page, homePage, sellerDashboardPage, productDetailPage }) => {
      await test.step('Navigate to seller dashboard', async () => {
        await page.goto('/');
        await expect(page.getByTestId('navbar')).toBeVisible();
        await homePage.navigateToSellerDashboard();
        await sellerDashboardPage.expectLoaded();
      });

      const wizard = new ProductWizardPage(page);

      await test.step('Open edit wizard for variant product', async () => {
        await page.getByTestId(`edit-product-${productId}`).click();
        await expect(wizard.root).toBeVisible();
      });

      await test.step('Update Size M price, Size L stock, and add Size XL', async () => {
        await wizard.editVariantProduct({
          variantUpdates: [
            { rowIndex: 1, price: '57.99' },
            { rowIndex: 2, stock: '20' },
          ],
          newValues: [
            { attrIndex: 0, value: 'XL', rowIndex: 3, price: '59.99', stock: '5' },
          ],
          imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
        });
        await expect(wizard.root).not.toBeVisible({ timeout: 10_000 });
      });

      await test.step('Verify updated price and new XL option on product detail page', async () => {
        await productDetailPage.goto(productId);
        await productDetailPage.enterBuyerPreview();
        await page.getByTestId('variant-value-Size-M').click();
        await expect(page.getByTestId('product-price')).toContainText('$57.99');
        await expect(page.getByTestId('variant-value-Size-XL')).toBeVisible();
      });
    },
  );

  test(
    'TC-046: seller deletes variant product from dashboard',
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
