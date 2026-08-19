// TC coverage: TC-054 (seller cannot see or manage another seller's products — web)

import { test, expect } from '../../../fixtures/base-fixture';
import { request as pwRequest } from '@playwright/test';
import { login, authHeaders, BUYER_EMAIL, TEST_PASSWORD } from '../../../helpers/api-client';
import { randomShippingMultipart } from '../../../helpers/test-data';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let seller2ProductId: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  // Promote b@test.com to seller2 (idempotent) and create a product
  const seller2Token = await login(ctx, BUYER_EMAIL, TEST_PASSWORD);
  await ctx.put('/api/auth/profile', {
    data: { role: 'seller' },
    headers: authHeaders(seller2Token),
  });

  const ts = Date.now();
  const res = await ctx.post('/api/seller/products', {
    multipart: {
      name: `Seller2 Web Access Test ${ts}`,
      description: 'TC-054 web — must not appear in seller1 dashboard',
      price: '30',
      category: 'Electronics',
      stock: '10',
      image: PLACEHOLDER_IMAGE,
      ...randomShippingMultipart(),
    },
    headers: authHeaders(seller2Token),
  });

  const body = await res.json();
  if (res.status() !== 201 || !body.product?._id) {
    throw new Error(`seller2 product creation failed: ${res.status()} ${JSON.stringify(body)}`);
  }
  seller2ProductId = body.product._id;
  await ctx.dispose();
});

test.describe('TC-054: Seller dashboard only shows own products', () => {
  test(
    'seller1 cannot see seller2 product in their dashboard',
    { tag: ['@TC-054', '@seller', '@seller-access'] },
    async ({ page, homePage, sellerDashboardPage }) => {
      await test.step('Navigate to seller1 dashboard', async () => {
        await page.goto('/');
        await homePage.navigateToSellerDashboard();
        await sellerDashboardPage.expectLoaded();
      });

      await test.step('Verify seller2 product is not listed in seller1 dashboard', async () => {
        await expect(
          page.getByTestId(`product-item-${seller2ProductId}`),
        ).not.toBeVisible();
      });
    },
  );

  test(
    'seller1 cannot see edit or delete controls for seller2 product',
    { tag: ['@TC-054', '@seller', '@seller-access'] },
    async ({ page, homePage, sellerDashboardPage }) => {
      await test.step('Navigate to seller1 dashboard', async () => {
        await page.goto('/');
        await homePage.navigateToSellerDashboard();
        await sellerDashboardPage.expectLoaded();
      });

      await test.step('Verify edit and delete controls for seller2 product are absent', async () => {
        await expect(
          page.getByTestId(`edit-product-${seller2ProductId}`),
        ).not.toBeVisible();

        await expect(
          page.getByTestId(`delete-product-${seller2ProductId}`),
        ).not.toBeVisible();
      });
    },
  );
});
