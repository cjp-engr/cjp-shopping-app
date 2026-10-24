// TC coverage: TC-110 (GET /api/orders returns only buyer's own orders),
//              TC-111 (GET /api/orders/:id returns 403 when buyer2 requests buyer1's order)

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders, login, signupFreshUser,
  SELLER_EMAIL, TEST_PASSWORD,
} from '../../helpers/api-client';
import { randomShippingMultipart } from '../../helpers/test-data';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const ADDR = { street: '123 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' };
const COD  = { type: 'cash-on-delivery' };
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let buyer1Token: string;
let buyer2Token: string;
let sellerToken: string;
let productId: string;
let buyer1OrderId: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  // Buyer1 and buyer2 are fresh buyer accounts, separate from the seller who owns the product
  ({ token: buyer1Token } = await signupFreshUser(ctx, 'order_isolation_buyer1'));
  ({ token: buyer2Token } = await signupFreshUser(ctx, 'order_isolation_buyer2'));

  // Seller creates a product for buyer1 to order
  const ts = Date.now();
  sellerToken = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);
  const productRes = await ctx.post('/api/seller/products', {
    multipart: {
      name: `Order Isolation Test Product ${ts}`,
      description: 'TC-110/TC-111 test product',
      price: '25',
      category: 'Electronics',
      stock: '10',
      image: PLACEHOLDER_IMAGE,
      ...randomShippingMultipart(),
    },
    headers: authHeaders(sellerToken),
  });
  const productBody = await productRes.json();
  if (!productRes.ok() || !productBody.product?._id) {
    throw new Error(`product creation failed: ${productRes.status()} ${JSON.stringify(productBody)}`);
  }
  productId = productBody.product._id;

  // Buyer1 places an order
  const orderRes = await ctx.post('/api/orders', {
    data: {
      items: [{ productId, quantity: 1 }],
      shippingAddress: ADDR,
      paymentMethod: COD,
    },
    headers: authHeaders(buyer1Token),
  });
  const orderBody = await orderRes.json();
  if (orderRes.status() !== 201 || !orderBody.orders?.[0]?._id) {
    throw new Error(`buyer1 order creation failed: ${orderRes.status()} ${JSON.stringify(orderBody)}`);
  }
  buyer1OrderId = orderBody.orders[0]._id;

  await ctx.dispose();
});

test.afterAll(async () => {
  // Cancel the order (restores stock), then remove the product, so repeated runs leave nothing behind
  const ctx = await pwRequest.newContext({ baseURL: API_URL });
  const cancelRes = await ctx.put(`/api/orders/${buyer1OrderId}/status`, {
    data: { status: 'cancelled' },
    headers: authHeaders(buyer1Token),
  });
  expect(cancelRes.ok()).toBeTruthy();
  const deleteRes = await ctx.delete(`/api/seller/products/${productId}`, {
    headers: authHeaders(sellerToken),
  });
  expect(deleteRes.ok()).toBeTruthy();
  await ctx.dispose();
});

// ── TC-110 ──────────────────────────────────────────────────────────────────

test.describe('TC-110: Order list isolation — buyer2 cannot see buyer1 orders', () => {
  test(
    'GET /api/orders with buyer2 token does not return buyer1 order',
    { tag: ['@TC-110', '@api', '@orders', '@security'] },
    async ({ request }) => {
      await test.step('Control: buyer1 sees their own order in GET /api/orders', async () => {
        const res = await request.get('/api/orders', {
          headers: authHeaders(buyer1Token),
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        const orderIds: string[] = (body.orders ?? []).map((o: any) => o._id);
        expect(orderIds).toContain(buyer1OrderId);
      });

      await test.step('Send GET /api/orders as buyer2 and assert buyer1 order is absent', async () => {
        const res = await request.get('/api/orders', {
          headers: authHeaders(buyer2Token),
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        const orderIds: string[] = (body.orders ?? []).map((o: any) => o._id);
        expect(orderIds).not.toContain(buyer1OrderId);
        // Buyer2 is a fresh account with no orders, so their own list is empty
        expect(orderIds).toHaveLength(0);
      });
    },
  );
});

// ── TC-111 ──────────────────────────────────────────────────────────────────

test.describe('TC-111: Order detail isolation — buyer2 gets 403 on buyer1 order', () => {
  test(
    'GET /api/orders/:id returns 403 when buyer2 requests buyer1 order',
    { tag: ['@TC-111', '@api', '@orders', '@security'] },
    async ({ request }) => {
      await test.step('Control: buyer1 can read their own order detail', async () => {
        const res = await request.get(`/api/orders/${buyer1OrderId}`, {
          headers: authHeaders(buyer1Token),
        });
        expect(res.status()).toBe(200);
      });

      await test.step('Send GET /api/orders/:id as buyer2 on buyer1 order and assert 403', async () => {
        const res = await request.get(`/api/orders/${buyer1OrderId}`, {
          headers: authHeaders(buyer2Token),
        });
        expect(res.status()).toBe(403);
      });
    },
  );
});
