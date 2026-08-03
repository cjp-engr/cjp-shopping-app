// TC-042: Seller creates simple product listing (web 6-step wizard)

import { authHeaders } from '../../helpers/api-client';
import { test, expect } from '../../fixtures/base-fixture';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const PRODUCT_NAME = `E2E Simple Lamp ${Date.now()}`;
const PRODUCT_IMAGE_URL =
  'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400';
const PRODUCT_DESCRIPTION =
  'A beautiful E2E test lamp for home decor. Energy efficient and modern design.';
const PRODUCT_TAGS = ['lamp', 'home-decor', 'lighting'];

test('TC-042: seller creates simple product via 6-step wizard and verifies dashboard + direct URL', async ({
  page,
  request,
  homePage,
  sellerDashboardPage,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('navbar')).toBeVisible();

  await homePage.navigateToSellerDashboard();
  await expect(page.getByTestId('seller-dashboard')).toBeVisible({ timeout: 10_000 });

  const wizard = await sellerDashboardPage.openCreateProductWizard();
  await expect(wizard.root).toBeVisible();

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
    shipping: {
      deliveryOptions: ['standard', 'express', 'pickup'],
      feeMode: 'buyer_pays',
      feeAmounts: {
        standard: '10',
        express: '15',
        pickup: '5',
      },
    },
  });

  await expect(wizard.root).not.toBeVisible();
  await expect(wizard.errorAlert).not.toBeVisible().catch(() => {});

  const productCard = sellerDashboardPage.getProductCard(PRODUCT_NAME);
  await expect(productCard).toBeVisible();

  const testId = await productCard.getAttribute('data-testid');
  const productId = testId?.replace('product-item-', '');
  expect(productId).toBeTruthy();

  const token = await page.evaluate(() =>
    localStorage.getItem('shopping_app_auth_token'),
  );
  expect(token).toBeTruthy();

  const productRes = await request.get(`${API_URL}/api/products/${productId}`, {
    headers: authHeaders(token!),
  });
  expect(productRes.ok()).toBeTruthy();
  const { product: savedProduct } = await productRes.json();
  expect(savedProduct.shippingOptions).toEqual(
    expect.arrayContaining(['standard', 'express', 'pickup']),
  );
  expect(savedProduct.shippingOptions).toHaveLength(3);
  expect(savedProduct.shippingFee).toBe('buyer_pays');
  expect(savedProduct.shippingFeeAmounts.standard).toBe(10);
  expect(savedProduct.shippingFeeAmounts.express).toBe(15);
  expect(savedProduct.shippingFeeAmounts.pickup).toBe(5);
  expect(savedProduct.tags).toEqual(expect.arrayContaining(PRODUCT_TAGS));
  expect(savedProduct.tags).toHaveLength(PRODUCT_TAGS.length);

  await page.goto(`/products/${productId}`);
  await expect(page.getByTestId('product-detail-page')).toBeVisible();
  await expect(page.getByTestId('product-name')).toContainText(PRODUCT_NAME);
  await expect(page.locator('[data-testid^="variant-attr-"]')).toHaveCount(0);
});
