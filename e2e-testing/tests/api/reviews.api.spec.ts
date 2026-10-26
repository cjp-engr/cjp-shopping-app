// TC coverage: TC-036 (review before delivery → 403, for a pending and a shipped order),
//              TC-035 (duplicate review → 409; the product rating and review count update once)
//
// Cleanup: pending orders are cancelled and the product is deleted. Shipped and delivered orders and
// the review itself cannot be removed through the API (there is no review delete endpoint and a buyer
// cannot cancel past pending), so those few records stay behind.

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

let buyerToken: string;
let sellerToken: string;
let testProductId: string;
const pendingOrderIds: string[] = [];

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  // The reviewer is a fresh buyer, not the seller who owns the product
  ({ token: buyerToken } = await signupFreshUser(ctx, 'reviews_buyer'));
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
      ...randomShippingMultipart(),
    },
    headers: authHeaders(sellerToken),
  });
  const pBody = await pRes.json();
  if (!pRes.ok() || !pBody.product?._id) {
    throw new Error(`product creation failed: ${pRes.status()} ${JSON.stringify(pBody)}`);
  }
  testProductId = pBody.product._id;

  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });
  const failures: string[] = [];

  for (const orderId of pendingOrderIds) {
    const res = await ctx.put(`/api/orders/${orderId}/status`, {
      data: { status: 'cancelled' },
      headers: authHeaders(buyerToken),
    });
    if (!res.ok()) failures.push(`order ${orderId}`);
  }
  const del = await ctx.delete(`/api/seller/products/${testProductId}`, { headers: authHeaders(sellerToken) });
  if (!del.ok()) failures.push(`product ${testProductId}`);

  await ctx.dispose();
  expect(failures, 'cleanup should remove what the API allows').toEqual([]);
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

/** Helper: seller moves an order through the given statuses */
async function sellerMoves(request: any, orderId: string, statuses: string[]): Promise<void> {
  for (const status of statuses) {
    const r = await request.put(`/api/seller/orders/${orderId}/status`, {
      data: { status },
      headers: authHeaders(sellerToken),
    });
    expect(r.status(), `seller move to ${status}`).toBe(200);
  }
}

/** Helper: advances an order all the way to delivered */
async function advanceToDelivered(request: any, orderId: string): Promise<void> {
  await sellerMoves(request, orderId, ['preparing', 'processing', 'shipped']);
  const r = await request.put(`/api/orders/${orderId}/confirm-received`, {
    headers: authHeaders(buyerToken),
  });
  expect(r.status()).toBe(200);
}

async function productRatingState(request: any): Promise<{ rating: number; reviews: number }> {
  const res = await request.get(`/api/products/${testProductId}`);
  expect(res.status()).toBe(200);
  const { product } = await res.json();
  return { rating: product.rating ?? 0, reviews: product.reviews ?? 0 };
}

// ── TC-036 ──────────────────────────────────────────────────────────────────

test.describe('TC-036: Review blocked before order is delivered', () => {
  test(
    'POST /api/reviews returns 403 for a non-delivered order',
    { tag: ['@TC-036', '@api', '@reviews'] },
    async ({ request }) => {
      let pendingOrderId: string;
      let shippedOrderId: string;

      await test.step('Place two orders (one stays pending, one is shipped)', async () => {
        pendingOrderId = await placeOrder(request);
        pendingOrderIds.push(pendingOrderId);
        shippedOrderId = await placeOrder(request);
        await sellerMoves(request, shippedOrderId, ['preparing', 'processing', 'shipped']);
      });

      for (const [label, getId] of [
        ['pending', () => pendingOrderId],
        ['shipped', () => shippedOrderId],
      ] as const) {
        await test.step(`Attempt to submit a review for the ${label} order and assert 403`, async () => {
          const res = await request.post('/api/reviews', {
            data: { productId: testProductId, orderId: getId(), rating: 5, comment: 'Great product!' },
            headers: authHeaders(buyerToken),
          });
          expect(res.status()).toBe(403);
          const body = await res.json();
          expect(body.message).toMatch(/delivered/i);
        });
      }

      await test.step('Assert no review was created', async () => {
        expect((await productRatingState(request)).reviews).toBe(0);
      });
    },
  );
});

// ── TC-035 ──────────────────────────────────────────────────────────────────

test.describe('TC-035: Duplicate review is blocked', () => {
  test(
    'POST /api/reviews returns 409 on second review for the same product',
    { tag: ['@TC-035', '@api', '@reviews'] },
    async ({ request }) => {
      let orderId: string;
      const payload = () => ({ productId: testProductId, orderId, rating: 4, comment: 'Good product' });

      await test.step('Place order and advance to delivered', async () => {
        orderId = await placeOrder(request);
        await advanceToDelivered(request, orderId);
      });

      await test.step('Submit first review and assert 201 with the product rating updated', async () => {
        const first = await request.post('/api/reviews', {
          data: payload(),
          headers: authHeaders(buyerToken),
        });
        expect(first.status()).toBe(201);
        const { data } = await first.json();
        expect(data.rating).toBe(4);
        expect(data.comment).toBe('Good product');

        // Product rating = average of its reviews (one decimal); reviews = count
        expect(await productRatingState(request)).toEqual({ rating: 4, reviews: 1 });
      });

      await test.step('Submit duplicate review and assert 409, leaving the product rating unchanged', async () => {
        const second = await request.post('/api/reviews', {
          data: payload(),
          headers: authHeaders(buyerToken),
        });
        expect(second.status()).toBe(409);
        const body = await second.json();
        expect(body.message).toMatch(/already reviewed/i);

        expect(await productRatingState(request)).toEqual({ rating: 4, reviews: 1 });
      });
    },
  );
});
