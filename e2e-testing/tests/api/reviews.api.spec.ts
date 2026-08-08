// TC coverage: TC-036 (review before delivery → 403),
//              TC-035 (duplicate review → 409)

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders, login,
  SELLER_EMAIL, TEST_PASSWORD,
  SELLER_EMAIL, TEST_PASSWORD,
} from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const ADDR = { street: '123 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' };
const COD  = { type: 'cash-on-delivery' };
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let buyerToken: string;
let sellerToken: string;
let testProductId: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  buyerToken  = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);
  sellerToken = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);

  // Create a dedicated test product so the test is self-sufficient
  const ts = Date.now();
  const pRes = await ctx.post('/api/seller/products', {
    multipart: {
      name: `Reviews Test Product ${ts}`,
      description: 'TC-035/036 reviews test product',
      price: '25',
      category: 'Electronics',
      stock: '20',
      image: PLACEHOLDER_IMAGE,
    },
    headers: authHeaders(sellerToken),
  });
  testProductId = (await pRes.json()).product._id;

  await ctx.dispose();
});

/** Helper: places a new order and returns its id */
async function placeOrder(request: any): Promise<string> {
  const res = await request.post('/api/orders', {
    data: { items: [{ productId: testProductId, quantity: 1 }], shippingAddress: ADDR, paymentMethod: COD },
    headers: authHeaders(buyerToken),
  });
  expect(res.status()).toBe(201);
  return (await res.json()).orders[0]._id;
}

/** Helper: advances an order all the way to delivered */
async function advanceToDelivered(request: any, orderId: string): Promise<void> {
  for (const status of ['preparing', 'processing', 'shipped'] as const) {
    const r = await request.put(`/api/seller/orders/${orderId}/status`, {
      data: { status },
      headers: authHeaders(sellerToken),
    });
    expect(r.status()).toBe(200);
  }
  const r = await request.put(`/api/orders/${orderId}/confirm-received`, {
    headers: authHeaders(buyerToken),
  });
  expect(r.status()).toBe(200);
}

// ── TC-036 ──────────────────────────────────────────────────────────────────

test.describe('TC-036: Review blocked before order is delivered', () => {
  test('POST /api/reviews returns 403 for a non-delivered order', async ({ request }) => {
    const orderId = await placeOrder(request);

    const res = await request.post('/api/reviews', {
      data: { productId: testProductId, orderId, rating: 5, comment: 'Great product!' },
      headers: authHeaders(buyerToken),
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/delivered/i);
  });
});

// ── TC-035 ──────────────────────────────────────────────────────────────────

test.describe('TC-035: Duplicate review is blocked', () => {
  test('POST /api/reviews returns 409 on second review for the same product', async ({ request }) => {
    // Full lifecycle: place order → advance to delivered
    const orderId = await placeOrder(request);
    await advanceToDelivered(request, orderId);

    const payload = { productId: testProductId, orderId, rating: 4, comment: 'Good product' };

    // First review — must succeed
    const first = await request.post('/api/reviews', {
      data: payload,
      headers: authHeaders(buyerToken),
    });
    expect(first.status()).toBe(201);

    // Second review same product — must conflict
    const second = await request.post('/api/reviews', {
      data: payload,
      headers: authHeaders(buyerToken),
    });
    expect(second.status()).toBe(409);
    const body = await second.json();
    expect(body.message).toMatch(/already reviewed/i);
  });
});
