// TC coverage: TC-026 (order total formula), TC-027 (shipping $9.99 < $50),
//              TC-028 (free shipping >= $50), TC-056 (insufficient stock → 400),
//              TC-033 (buyer cancel processing order → 400),
//              TC-025 (multi-seller checkout → 2 orders)

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders, login,
  SELLER_EMAIL, TEST_PASSWORD,
  SELLER_EMAIL, TEST_PASSWORD,
  BUYER_EMAIL,
} from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const ADDR = { street: '123 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' };
const COD  = { type: 'cash-on-delivery' };
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let buyerToken: string;
let sellerToken: string;
let cheapProductId: string;
let expensiveProductId: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  buyerToken  = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);
  sellerToken = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);

  // Create test products with default shipping (no shippingFee field) so the
  // standard $9.99 / free-over-$50 rule applies deterministically.
  const ts = Date.now();

  const cheapRes = await ctx.post('/api/seller/products', {
    multipart: {
      name: `API Cheap ${ts}`,
      description: 'TC-026/027 test product — default shipping, price < $50',
      price: '20',
      category: 'Electronics',
      stock: '50',
      image: PLACEHOLDER_IMAGE,
    },
    headers: authHeaders(sellerToken),
  });
  cheapProductId = (await cheapRes.json()).product._id;

  const expensiveRes = await ctx.post('/api/seller/products', {
    multipart: {
      name: `API Expensive ${ts}`,
      description: 'TC-028 test product — default shipping, price >= $50',
      price: '99',
      category: 'Electronics',
      stock: '20',
      image: PLACEHOLDER_IMAGE,
    },
    headers: authHeaders(sellerToken),
  });
  expensiveProductId = (await expensiveRes.json()).product._id;

  await ctx.dispose();
});

// ── TC-026 ──────────────────────────────────────────────────────────────────

test.describe('TC-026: Order total matches pricing formula', () => {
  test('tax is 8% of after-discount subtotal; total = afterDiscounts + tax + shipping', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: { items: [{ productId: cheapProductId, quantity: 1 }], shippingAddress: ADDR, paymentMethod: COD },
      headers: authHeaders(buyerToken),
    });
    expect(res.status()).toBe(201);

    const { orders } = await res.json();
    const o = orders[0];

    const afterDiscounts = o.subtotal - o.productDiscount - o.discount;
    expect(o.tax).toBeCloseTo(afterDiscounts * 0.08, 2);
    expect(o.total).toBeCloseTo(afterDiscounts + o.tax + o.shipping, 2);
  });
});

// ── TC-027 ──────────────────────────────────────────────────────────────────

test.describe('TC-027: Shipping $9.99 when effective subtotal < $50', () => {
  test('order with cheap product gets $9.99 default shipping', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: { items: [{ productId: cheapProductId, quantity: 1 }], shippingAddress: ADDR, paymentMethod: COD },
      headers: authHeaders(buyerToken),
    });
    expect(res.status()).toBe(201);

    const { orders } = await res.json();
    const o = orders[0];
    const afterDiscounts = o.subtotal - o.productDiscount - o.discount;

    expect(afterDiscounts).toBeLessThan(50);
    expect(o.shipping).toBe(9.99);
  });
});

// ── TC-028 ──────────────────────────────────────────────────────────────────

test.describe('TC-028: Free shipping when effective subtotal >= $50', () => {
  test('order with expensive product gets $0 shipping', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: { items: [{ productId: expensiveProductId, quantity: 1 }], shippingAddress: ADDR, paymentMethod: COD },
      headers: authHeaders(buyerToken),
    });
    expect(res.status()).toBe(201);

    const { orders } = await res.json();
    const o = orders[0];
    const afterDiscounts = o.subtotal - o.productDiscount - o.discount;

    expect(afterDiscounts).toBeGreaterThanOrEqual(50);
    expect(o.shipping).toBe(0);
  });
});

// ── TC-056 ──────────────────────────────────────────────────────────────────

test.describe('TC-056: Insufficient stock at checkout returns 400', () => {
  test('POST /api/orders returns 400 when quantity exceeds stock', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: { items: [{ productId: cheapProductId, quantity: 99999 }], shippingAddress: ADDR, paymentMethod: COD },
      headers: authHeaders(buyerToken),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/insufficient stock/i);
  });
});

// ── TC-033 ──────────────────────────────────────────────────────────────────

test.describe('TC-033: Buyer cannot cancel a processing order', () => {
  test('PUT /api/orders/:id/status returns 400 when order is in processing', async ({ request }) => {
    // Create order as buyer
    const orderRes = await request.post('/api/orders', {
      data: { items: [{ productId: cheapProductId, quantity: 1 }], shippingAddress: ADDR, paymentMethod: COD },
      headers: authHeaders(buyerToken),
    });
    expect(orderRes.status()).toBe(201);
    const orderId = (await orderRes.json()).orders[0]._id;

    // Seller advances: pending → preparing → processing
    await request.put(`/api/seller/orders/${orderId}/status`, {
      data: { status: 'preparing' },
      headers: authHeaders(sellerToken),
    });
    await request.put(`/api/seller/orders/${orderId}/status`, {
      data: { status: 'processing' },
      headers: authHeaders(sellerToken),
    });

    // Buyer attempts cancel → must fail
    const cancelRes = await request.put(`/api/orders/${orderId}/status`, {
      data: { cancelReason: 'Changed my mind' },
      headers: authHeaders(buyerToken),
    });
    expect(cancelRes.status()).toBe(400);
  });
});

// ── TC-025 ──────────────────────────────────────────────────────────────────

test.describe('TC-025: Multi-seller checkout creates separate orders', () => {
  let seller2Token: string;
  let seller2ProductId: string;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext({ baseURL: API_URL });

    // Promote buyer2 account to seller (idempotent)
    seller2Token = await login(ctx, BUYER_EMAIL, TEST_PASSWORD);
    await ctx.put('/api/auth/profile', {
      data: { role: 'seller' },
      headers: authHeaders(seller2Token),
    });

    // Create a product as seller2 (no images required — multer allows empty)
    const productRes = await ctx.post('/api/seller/products', {
      multipart: {
        name: 'Multi-Seller API Test Product',
        description: 'Created by TC-025 setup; safe to delete after tests',
        price: '25',
        category: 'Electronics',
        stock: '20',
        image: PLACEHOLDER_IMAGE,
      },
      headers: authHeaders(seller2Token),
    });
    const productBody = await productRes.json();
    seller2ProductId = productBody.product._id;

    await ctx.dispose();
  });

  test('cart with items from 2 sellers creates 2 separate orders', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: {
        items: [
          { productId: cheapProductId,     quantity: 1 },
          { productId: seller2ProductId,   quantity: 1 },
        ],
        shippingAddress: ADDR,
        paymentMethod: COD,
      },
      headers: authHeaders(buyerToken),
    });
    expect(res.status()).toBe(201);

    const { orders } = await res.json();
    expect(orders).toHaveLength(2);
    expect(orders[0]._id).not.toBe(orders[1]._id);
  });
});
