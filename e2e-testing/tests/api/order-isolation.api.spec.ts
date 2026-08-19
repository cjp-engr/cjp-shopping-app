// TC coverage: TC-110 (GET /api/orders returns only buyer's own orders),
//              TC-111 (GET /api/orders/:id returns 403 when buyer2 requests buyer1's order)

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders, login,
  SELLER_EMAIL, TEST_PASSWORD,
} from '../../helpers/api-client';
import { randomShippingMultipart } from '../../helpers/test-data';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const ADDR = { street: '123 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' };
const COD  = { type: 'cash-on-delivery' };
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let buyer1Token: string;
let buyer2Token: string;
let buyer1OrderId: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  // Buyer1 — seeded account
  buyer1Token = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);

  // Buyer2 — fresh account with no orders
  const ts = Date.now();
  const signupRes = await ctx.post('/api/auth/signup', {
    data: {
      firstName: 'OrderIsolation',
      lastName: 'Buyer2',
      email: `order_isolation_buyer2_${ts}@test.com`,
      password: 'Test750!!',
    },
  });
  buyer2Token = (await signupRes.json()).token;

  // Seller creates a product for buyer1 to order
  const sellerToken = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);
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
  const productId = (await productRes.json()).product._id;

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

// ── TC-110 ──────────────────────────────────────────────────────────────────

test.describe('TC-110: Order list isolation — buyer2 cannot see buyer1 orders', () => {
  test('GET /api/orders with buyer2 token does not return buyer1 order', async ({ request }) => {
    await test.step('Send GET /api/orders as buyer2 and assert buyer1 order is absent', async () => {
      const res = await request.get('/api/orders', {
        headers: authHeaders(buyer2Token),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      const orderIds: string[] = (body.orders ?? []).map((o: any) => o._id);
      expect(orderIds).not.toContain(buyer1OrderId);
    });
  });
});

// ── TC-111 ──────────────────────────────────────────────────────────────────

test.describe('TC-111: Order detail isolation — buyer2 gets 403 on buyer1 order', () => {
  test('GET /api/orders/:id returns 403 when buyer2 requests buyer1 order', async ({ request }) => {
    await test.step('Send GET /api/orders/:id as buyer2 on buyer1 order and assert 403', async () => {
      const res = await request.get(`/api/orders/${buyer1OrderId}`, {
        headers: authHeaders(buyer2Token),
      });
      expect(res.status()).toBe(403);
    });
  });
});
