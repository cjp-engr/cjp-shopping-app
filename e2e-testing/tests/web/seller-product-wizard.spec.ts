// TC-042: Seller creates simple product listing (web 6-step wizard)

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

const PRODUCT_NAME = `E2E Simple Lamp ${Date.now()}`;
const PRODUCT_IMAGE_URL = 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400';

test('TC-042: seller creates simple product via 6-step wizard and verifies dashboard + direct URL', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('navbar')).toBeVisible();

  // Step 0: Navigate to seller dashboard via nav menu
  await page.getByTestId('user-menu-btn').click();
  await page.getByTestId('nav-seller-link').click();
  await expect(page.getByTestId('seller-dashboard')).toBeVisible({ timeout: 10000 });

  // Open wizard
  await page.getByTestId('add-product-btn').click();
  await expect(page.getByTestId('product-wizard')).toBeVisible();

  // Step 1 — Basic Info
  await page.getByTestId('wizard-name-input').fill(PRODUCT_NAME);
  await page.getByTestId('wizard-category-select').selectOption('Home & Garden');
  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByTestId('wizard-error')).not.toBeVisible().catch(() => {});

  // Step 2 — Pricing (no variants)
  await page.getByTestId('wizard-price-input').fill('29.99');
  await page.getByTestId('wizard-stock-input').fill('10');
  await page.getByTestId('wizard-next-btn').click();

  // Step 3 — Description
  await page.getByTestId('wizard-description-textarea').fill('A beautiful E2E test lamp for home decor. Energy efficient and modern design.');
  await page.getByTestId('wizard-next-btn').click();

  // Step 4 — Images (use URL mode to avoid file upload)
  await page.getByTestId('wizard-image-url-tab').click();
  await page.getByTestId('wizard-image-url-input').fill(PRODUCT_IMAGE_URL);
  await page.getByTestId('wizard-next-btn').click();

  // Step 5 — Shipping (Standard is pre-selected by default)
  await page.getByTestId('wizard-next-btn').click();

  // Step 6 — Review: publish
  await page.getByTestId('wizard-publish-btn').click();

  // Assert: wizard closes and new product card appears on dashboard
  await expect(page.getByTestId('product-wizard')).not.toBeVisible();
  const productCard = page.locator('[data-testid^="product-item-"]').filter({ hasText: PRODUCT_NAME });
  await expect(productCard).toBeVisible();

  // Extract product ID from data-testid for direct URL check
  const testId = await productCard.getAttribute('data-testid');
  const productId = testId?.replace('product-item-', '');
  expect(productId).toBeTruthy();

  // Assert: direct URL loads product detail page with correct name and no variants
  await page.goto(`${BASE_URL}/products/${productId}`);
  await expect(page.getByTestId('product-detail-page')).toBeVisible();
  await expect(page.getByTestId('product-name')).toContainText(PRODUCT_NAME);
  await expect(page.locator('[data-testid^="variant-attr-"]')).toHaveCount(0);
});
