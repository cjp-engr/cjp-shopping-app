// TC coverage: TC-109 (cart isolation — buyer2 sees own empty cart in UI, not buyer1's items)

import { test, expect } from '../../../fixtures/base-fixture';
import { request as pwRequest, APIRequestContext } from '@playwright/test';
import { authHeaders, login, TEST_EMAIL, TEST_PASSWORD } from '../../../helpers/api-client';
import { injectAuth } from '../../../helpers/auth-inject';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

let buyer1Token: string;
let buyer2Token: string;
let buyer2UserData: Record<string, unknown>;
let testProductId: string;

test.beforeAll(async () => {
  const ctx: APIRequestContext = await pwRequest.newContext({ baseURL: API_URL });

  // Buyer1 — seeded account; add a product to their server-side cart
  buyer1Token = await login(ctx, TEST_EMAIL, TEST_PASSWORD);

  const productsRes = await ctx.get('/api/products?limit=1');
  const { products } = await productsRes.json();
  testProductId = products[0]._id;

  await ctx.delete('/api/cart', { headers: authHeaders(buyer1Token) });
  await ctx.put('/api/cart', {
    data: { items: [{ productId: testProductId, quantity: 1 }] },
    headers: authHeaders(buyer1Token),
  });

  // Buyer2 — fresh account with an empty cart
  const ts = Date.now();
  const signupRes = await ctx.post('/api/auth/signup', {
    data: {
      firstName: 'CartBuyer',
      lastName: 'Two',
      email: `cart_web_buyer2_${ts}@test.com`,
      password: 'Test750!!',
    },
  });
  const signupBody = await signupRes.json();
  buyer2Token = signupBody.token;
  buyer2UserData = signupBody.user;

  await ctx.dispose();
});

test.describe('Cart isolation: buyer2 sees own empty cart in UI', () => {
  test('TC-109: buyer2 cannot see buyer1 cart items on the cart page', async ({ page, cartPage }) => {
    await page.goto('/');
    await injectAuth(page, buyer2Token, buyer2UserData);

    await page.goto('/cart');
    await expect(page.getByTestId('cart-empty').or(cartPage.root)).toBeVisible({ timeout: 10_000 });

    await expect(cartPage.cartItem(testProductId)).not.toBeVisible();
    await expect(page.getByTestId('cart-empty')).toBeVisible();
  });
});
