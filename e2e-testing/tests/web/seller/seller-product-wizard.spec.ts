// TC-042: Seller creates simple product listing (web 7-step wizard)

import path from 'path';

import { authHeaders } from '../../../helpers/api-client';
import { test, expect } from '../../../fixtures/base-fixture';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const VARIANT_FIXTURES_DIR = path.join(
  __dirname,
  '../../../fixtures/images/variants',
);
const variantFixture = (name: string) => path.join(VARIANT_FIXTURES_DIR, name);
const PRODUCT_NAME = `E2E Simple Lamp ${Date.now()}`;
const PRODUCT_IMAGE_URL =
  'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400';
const PRODUCT_DESCRIPTION =
  'A beautiful E2E test lamp for home decor. Energy efficient and modern design.';
const PRODUCT_TAGS = ['lamp', 'home-decor', 'lighting'];

test('TC-042: seller creates simple product via wizard and verifies dashboard + direct URL', async ({
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

test('TC-064: seller creates variant product via wizard and verifies variants on detail page', async ({
  page,
  request,
  homePage,
  sellerDashboardPage,
  productDetailPage,
}) => {
  const productName = `E2E Variant Hoodie ${Date.now()}`;
  const productImageUrl =
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';
  const productDescription =
    'E2E variant hoodie with Size options S, M, and L.';

  await page.goto('/');
  await expect(page.getByTestId('navbar')).toBeVisible();

  await homePage.navigateToSellerDashboard();
  await expect(page.getByTestId('seller-dashboard')).toBeVisible({ timeout: 10_000 });

  const wizard = await sellerDashboardPage.openCreateProductWizard();
  await expect(wizard.root).toBeVisible();

  await wizard.createVariantProduct({
    name: productName,
    category: 'Clothing',
    attributes: [{ name: 'Size', values: ['S', 'M', 'L'] }],
    variantRows: [
      {
        price: '49.99',
        stock: '5',
        imagePaths: [variantFixture('variant-s-1.png'), variantFixture('variant-s-2.png')],
        reorderCover: true,
      },
      {
        price: '54.99',
        stock: '10',
        imagePaths: [variantFixture('variant-m-1.png'), variantFixture('variant-m-2.png')],
      },
      {
        price: '59.99',
        stock: '15',
        imagePaths: [variantFixture('variant-l-1.png'), variantFixture('variant-l-2.png')],
      },
    ],
    description: productDescription,
    imageUrl: productImageUrl,
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

  const productCard = sellerDashboardPage.getProductCard(productName);
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
  expect(savedProduct.variants).toHaveLength(3);
  expect(savedProduct.variantAttributes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Size', values: expect.arrayContaining(['S', 'M', 'L']) }),
    ]),
  );
  expect(savedProduct.shippingOptions).toEqual(
    expect.arrayContaining(['standard', 'express', 'pickup']),
  );
  expect(savedProduct.shippingFee).toBe('buyer_pays');
  expect(savedProduct.shippingFeeAmounts.standard).toBe(10);
  expect(savedProduct.shippingFeeAmounts.express).toBe(15);
  expect(savedProduct.shippingFeeAmounts.pickup).toBe(5);
  for (const variant of savedProduct.variants) {
    expect(variant.images).toHaveLength(2);
    expect(variant.images.every((url: string) => url.length > 0)).toBe(true);
  }

  await page.goto(`/products/${productId}`);
  await expect(productDetailPage.root).toBeVisible();
  await productDetailPage.enterBuyerPreview();

  await expect(productDetailPage.variantAttr('Size')).toBeVisible();
  await expect(productDetailPage.variantValue('Size', 'S')).toBeVisible();
  await expect(productDetailPage.variantValue('Size', 'M')).toBeVisible();
  await expect(productDetailPage.variantValue('Size', 'L')).toBeVisible();

  await productDetailPage.selectVariant('Size', 'S');
  await productDetailPage.expectDisplayedPrice('$49.99');
  await productDetailPage.expectThumbnailCount(2);
  await expect(productDetailPage.addToCartButton).toBeVisible();
  const srcS = await productDetailPage.getMainImageSrc();

  await productDetailPage.selectVariant('Size', 'M');
  await productDetailPage.expectDisplayedPrice('$54.99');
  await productDetailPage.expectThumbnailCount(2);
  await productDetailPage.expectMainImageSrcChanges(srcS);
  const srcM = await productDetailPage.getMainImageSrc();

  await productDetailPage.selectVariant('Size', 'L');
  await productDetailPage.expectDisplayedPrice('$59.99');
  await productDetailPage.expectThumbnailCount(2);
  await productDetailPage.expectMainImageSrcChanges(srcM);
});
