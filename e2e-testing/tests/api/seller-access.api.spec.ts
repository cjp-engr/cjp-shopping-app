// TC coverage: TC-053 (buyer blocked from seller routes → 403),
//              TC-054 (seller cannot edit or delete another seller's product → 403),
//              TC-048 (invalid seller order status transition → 400)

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders, login, signupFreshUser,
  SELLER_EMAIL, TEST_PASSWORD,
  BUYER_EMAIL,
} from '../../helpers/api-client';
import { randomShippingMultipart } from '../../helpers/test-data';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const ADDR = { street: '123 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' };
const COD  = { type: 'cash-on-delivery' };
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let freshBuyerToken: string;  // newly registered account — guaranteed non-seller
let seller1Token: string;
let seller2Token: string;
let seller1ProductId: string;

// For TC-054 — a product owned by seller2 that seller1 cannot edit
let seller2ProductId: string;

// Created by the run and removed in afterAll
const orderIds: string[] = [];

async function createProduct(
  ctx: import('@playwright/test').APIRequestContext,
  token: string,
  name: string,
  price: string,
  stock: string,
): Promise<string> {
  const res = await ctx.post('/api/seller/products', {
    multipart: {
      name,
      description: 'TC-048/053/054 test product — safe to delete',
      price,
      category: 'Electronics',
      stock,
      image: PLACEHOLDER_IMAGE,
      ...randomShippingMultipart(),
    },
    headers: authHeaders(token),
  });
  const body = await res.json();
  if (res.status() !== 201 || !body.product?._id) {
    throw new Error(`product creation failed (${name}): ${res.status()} ${JSON.stringify(body)}`);
  }
  return body.product._id as string;
}

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  seller1Token = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);

  // Register a brand-new buyer account so we can be certain they are not a seller,
  // regardless of what prior test runs did to the seeded accounts.
  ({ token: freshBuyerToken } = await signupFreshUser(ctx, 'api_buyer'));

  const ts = Date.now();
  // A product owned by seller1 for order-based tests
  seller1ProductId = await createProduct(ctx, seller1Token, `Seller1 Access Test ${ts}`, '25', '20');

  // ── Seller2 setup (for TC-054) ────────────────────────────────────────────
  // Promote the second seeded account to seller (idempotent; shared with the other API specs)
  // and create a product as seller2
  seller2Token = await login(ctx, BUYER_EMAIL, TEST_PASSWORD);
  await ctx.put('/api/auth/profile', {
    data: { role: 'seller' },
    headers: authHeaders(seller2Token),
  });
  seller2ProductId = await createProduct(ctx, seller2Token, `Seller2 TC-054 Test Product ${ts}`, '20', '10');

  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });
  const failures: string[] = [];

  // Cancel the pending orders first (restores stock), then remove both products
  for (const id of orderIds) {
    const res = await ctx.put(`/api/orders/${id}/status`, {
      data: { status: 'cancelled' },
      headers: authHeaders(freshBuyerToken),
    });
    if (!res.ok()) failures.push(`order ${id}`);
  }
  for (const [id, token] of [[seller1ProductId, seller1Token], [seller2ProductId, seller2Token]] as const) {
    if (!id) continue;
    const res = await ctx.delete(`/api/seller/products/${id}`, { headers: authHeaders(token) });
    if (!res.ok()) failures.push(`product ${id}`);
  }

  await ctx.dispose();
  expect(failures, 'cleanup should remove what the run created').toEqual([]);
});

// ── TC-053 ──────────────────────────────────────────────────────────────────

test.describe('TC-053: Buyer is blocked from seller-only routes', () => {
  test(
    'PUT /api/seller/orders/:id/status returns 403 for buyer token',
    { tag: ['@TC-053', '@api', '@seller-access', '@security'] },
    async ({ request }) => {
      await test.step('Send PUT /api/seller/orders/:id/status with buyer token and assert 403', async () => {
        const res = await request.put('/api/seller/orders/000000000000000000000000/status', {
          data: { status: 'processing' },
          headers: authHeaders(freshBuyerToken),
        });
        expect(res.status()).toBe(403);
      });
    },
  );
});

// ── TC-054 ──────────────────────────────────────────────────────────────────

test.describe('TC-054: Seller cannot edit another sellers product', () => {
  test(
    'PUT /api/products/:id returns 403 when seller does not own the product',
    { tag: ['@TC-054', '@api', '@seller-access', '@security'] },
    async ({ request }) => {
      await test.step('Send PUT /api/products/:id as seller1 on seller2 product and assert 403', async () => {
        // seller1 tries to update seller2's product — use multipart because the route uses multer
        const res = await request.put(`/api/products/${seller2ProductId}`, {
          multipart: {
            name: 'Hacked Name',
            description: 'Unauthorized edit attempt',
            price: '1',
            category: 'Electronics',
            stock: '0',
          },
          headers: authHeaders(seller1Token),
        });
        expect(res.status()).toBe(403);
      });
    },
  );
});

test.describe('TC-054: Seller cannot delete another sellers product', () => {
  test(
    'DELETE /api/products/:id returns 403 when seller does not own the product',
    { tag: ['@TC-054', '@api', '@seller-access', '@security'] },
    async ({ request }) => {
      await test.step('Send DELETE /api/products/:id as seller1 on seller2 product and assert 403', async () => {
        const res = await request.delete(`/api/products/${seller2ProductId}`, {
          headers: authHeaders(seller1Token),
        });
        expect(res.status()).toBe(403);
        const body = await res.json();
        expect(body.message).toMatch(/not authorized/i);
      });
    },
  );
});

// ── TC-048 ──────────────────────────────────────────────────────────────────

test.describe('TC-048: Invalid seller order status transition returns 400', () => {
  test(
    'skipping from pending directly to shipped returns 400',
    { tag: ['@TC-048', '@api', '@seller-access', '@orders'] },
    async ({ request }) => {
      let orderId: string;

      await test.step('Place fresh order as buyer', async () => {
        const orderRes = await request.post('/api/orders', {
          data: {
            items: [{ productId: seller1ProductId, quantity: 1 }],
            shippingAddress: ADDR,
            paymentMethod: COD,
          },
          headers: authHeaders(freshBuyerToken),
        });
        expect(orderRes.status()).toBe(201);
        orderId = (await orderRes.json()).orders[0]._id;
        orderIds.push(orderId);
      });

      await test.step('Attempt invalid transition pending → shipped and assert 400', async () => {
        const res = await request.put(`/api/seller/orders/${orderId}/status`, {
          data: { status: 'shipped' },
          headers: authHeaders(seller1Token),
        });
        expect(res.status()).toBe(400);
        const body = await res.json();
        expect(body.message).toMatch(/Cannot transition order from 'pending' to 'shipped'/i);
      });
    },
  );
});
