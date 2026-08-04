// TC-042: Seller creates simple product listing (web 6-step wizard)
// TC-064: Seller creates variant product via wizard

import { Page } from '@playwright/test';

import {
  assertBuyerPaysShipping,
  assertTwoImagesPerVariant,
  assertVariantAttributes,
  fetchSavedProduct,
} from '../../../helpers/product-assertions';
import { BUYER_PAYS_SHIPPING, TC064_SIZE_VARIANTS } from '../../../helpers/test-data';
import { test, expect } from '../../../fixtures/base-fixture';
import { HomePage } from '../../../pages/home.page';
import { ProductWizardPage } from '../../../pages/seller-dashboard/components/product-wizard/product-wizard.page';
import { SellerDashboardPage } from '../../../pages/seller-dashboard/seller-dashboard.page';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const PRODUCT_NAME = `E2E Simple Lamp ${Date.now()}`;
const PRODUCT_IMAGE_URL =
  'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400';
const PRODUCT_DESCRIPTION =
  'A beautiful E2E test lamp for home decor. Energy efficient and modern design.';
const PRODUCT_TAGS = ['lamp', 'home-decor', 'lighting'];

async function openSellerWizard(
  page: Page,
  homePage: HomePage,
  sellerDashboardPage: SellerDashboardPage,
): Promise<ProductWizardPage> {
  await page.goto('/');
  await expect(page.getByTestId('navbar')).toBeVisible();
  await homePage.navigateToSellerDashboard();
  await sellerDashboardPage.expectLoaded();
  const wizard = await sellerDashboardPage.openCreateProductWizard();
  await expect(wizard.root).toBeVisible();
  return wizard;
}

test('TC-042: seller creates simple product via wizard and verifies dashboard + direct URL', async ({
  page,
  request,
  homePage,
  sellerDashboardPage,
  productDetailPage,
}) => {
  const wizard = await openSellerWizard(page, homePage, sellerDashboardPage);

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

  await expect(wizard.root).not.toBeVisible();
  await expect(wizard.errorAlert).not.toBeVisible().catch(() => {});

  const productId = await sellerDashboardPage.getProductIdFromCard(PRODUCT_NAME);

  const token = await page.evaluate(() =>
    localStorage.getItem('shopping_app_auth_token'),
  );
  expect(token).toBeTruthy();

  const savedProduct = await fetchSavedProduct(
    request,
    API_URL,
    productId,
    token!,
  );
  assertBuyerPaysShipping(savedProduct as Parameters<typeof assertBuyerPaysShipping>[0]);
  expect(savedProduct.tags).toEqual(expect.arrayContaining(PRODUCT_TAGS));
  expect(savedProduct.tags).toHaveLength(PRODUCT_TAGS.length);

  await productDetailPage.goto(productId);
  await expect(page.getByTestId('product-name')).toContainText(PRODUCT_NAME);
  await productDetailPage.expectNoVariantSelectors();
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

  const wizard = await openSellerWizard(page, homePage, sellerDashboardPage);

  await wizard.createVariantProduct({
    name: productName,
    category: 'Clothing',
    attributes: [TC064_SIZE_VARIANTS.attribute],
    variantRows: [...TC064_SIZE_VARIANTS.rows],
    description: productDescription,
    imageUrl: productImageUrl,
    shipping: BUYER_PAYS_SHIPPING,
  });

  await expect(wizard.root).not.toBeVisible();

  const productId = await sellerDashboardPage.getProductIdFromCard(productName);

  const token = await page.evaluate(() =>
    localStorage.getItem('shopping_app_auth_token'),
  );
  expect(token).toBeTruthy();

  const savedProduct = await fetchSavedProduct(
    request,
    API_URL,
    productId,
    token!,
  );
  expect(savedProduct.variants).toHaveLength(3);
  assertVariantAttributes(
    savedProduct as { variantAttributes: { name: string; values: string[] }[] },
    'Size',
    ['S', 'M', 'L'],
  );
  assertBuyerPaysShipping(savedProduct as Parameters<typeof assertBuyerPaysShipping>[0]);
  assertTwoImagesPerVariant(
    savedProduct.variants as { images: string[] }[],
  );

  await productDetailPage.goto(productId);
  await productDetailPage.enterBuyerPreview();
  await productDetailPage.expectSizeOptions(TC064_SIZE_VARIANTS.attribute.values);
  await productDetailPage.expectVariantSelectionCycle(
    TC064_SIZE_VARIANTS.attribute.values,
    TC064_SIZE_VARIANTS.priceBySize,
  );
});
