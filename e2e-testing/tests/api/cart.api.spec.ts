// TC coverage: TC-107 (GET /api/cart returns buyer's own items),
//              TC-108 (cart isolation — buyer2 cannot access buyer1's cart at API layer),
//              TC-109 (unauthenticated GET /api/cart → 401)

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders, login,
  SELLER_EMAIL, TEST_PASSWORD,
} from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

let buyer1Token: string;
let buyer2Token: string;
let testProductId: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  // Buyer1 — existing seeded account
  buyer1Token = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);

  // Buyer2 — fresh account to guarantee a clean slate
  const ts = Date.now();
  const signupRes = await ctx.post('/api/auth/signup', {
    data: {
      firstName: 'Buyer',
      lastName: 'Two',
      email: `cart_buyer2_${ts}@test.com`,
      password: 'Test750!!',
    },
  });
  buyer2Token = (await signupRes.json()).token;

  // Pick any product to add to buyer1's cart
  const productsRes = await ctx.get('/api/products?limit=1');
  const { products } = await productsRes.json();
  testProductId = products[0]._id;

  // Clear buyer1's cart first, then sync with one item
  await ctx.delete('/api/cart', { headers: authHeaders(buyer1Token) });
  await ctx.put('/api/cart', {
    data: { items: [{ productId: testProductId, quantity: 1 }] },
    headers: authHeaders(buyer1Token),
  });

  await ctx.dispose();
});

test.describe('Cart isolation: buyer2 cannot access buyer1 cart contents', () => {
  test('TC-107: GET /api/cart returns buyer1 items for buyer1', async ({ request }) => {
    const res = await request.get('/api/cart', {
      headers: authHeaders(buyer1Token),
    });
    expect(res.status()).toBe(200);
    const { sellers } = await res.json();
    const allProductIds = (sellers as any[]).flatMap(s =>
      s.items.map((i: any) => i.product?._id ?? i.product?.toString()),
    );
    expect(allProductIds).toContain(testProductId);
  });

  test('TC-108: GET /api/cart returns empty cart for buyer2, not buyer1 items', async ({ request }) => {
    const res = await request.get('/api/cart', {
      headers: authHeaders(buyer2Token),
    });
    expect(res.status()).toBe(200);
    const { sellers } = await res.json();
    const allProductIds = (sellers as any[]).flatMap(s =>
      s.items.map((i: any) => i.product?._id ?? i.product?.toString()),
    );
    expect(allProductIds).not.toContain(testProductId);
  });

  test('GET /api/cart without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/cart');
    expect(res.status()).toBe(401);
  });
});
