// TC coverage: TC-053 (buyer blocked from seller routes → 403),
//              TC-054 (seller cannot edit another seller's product → 403),
//              TC-048 (invalid seller order status transition → 400)

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders, login,
  TEST_EMAIL, TEST_PASSWORD,
  SELLER_EMAIL, PASSWORD,
  BUYER_EMAIL,
} from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const ADDR = { street: '123 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' };
const COD  = { type: 'cash-on-delivery' };
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let freshBuyerToken: string;  // newly registered account — guaranteed non-seller
let seller1Token: string;
let seller1ProductId: string;

// For TC-054 — a product owned by seller2 that seller1 cannot edit
let seller2ProductId: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  seller1Token = await login(ctx, SELLER_EMAIL, PASSWORD);

  // Register a brand-new buyer account so we can be certain they are not a seller,
  // regardless of what prior test runs did to the seeded accounts.
  const ts = Date.now();
  const signupRes = await ctx.post('/api/auth/signup', {
    data: {
      firstName: 'API',
      lastName: 'BuyerTest',
      email: `api_buyer_${ts}@test.com`,
      password: 'Test750!!',
    },
  });
  freshBuyerToken = (await signupRes.json()).token;

  // Create a product owned by seller1 for order-based tests
  const p1Res = await ctx.post('/api/seller/products', {
    multipart: {
      name: `Seller1 Access Test ${ts}`,
      description: 'TC-048/053 test product',
      price: '25',
      category: 'Electronics',
      stock: '20',
      image: PLACEHOLDER_IMAGE,
    },
    headers: authHeaders(seller1Token),
  });
  seller1ProductId = (await p1Res.json()).product._id;

  // ── Seller2 setup (for TC-054) ────────────────────────────────────────────
  // Promote buyer2 to seller (idempotent) and create a product as seller2
  const seller2Token = await login(ctx, BUYER_EMAIL, PASSWORD);
  await ctx.put('/api/auth/profile', {
    data: { role: 'seller' },
    headers: authHeaders(seller2Token),
  });
  const productRes = await ctx.post('/api/seller/products', {
    multipart: {
      name: 'Seller2 TC-054 Test Product',
      description: 'Ownership test product — safe to delete after tests',
      price: '20',
      category: 'Electronics',
      stock: '10',
      image: PLACEHOLDER_IMAGE,
    },
    headers: authHeaders(seller2Token),
  });
  const productBody = await productRes.json();
  if (productRes.status() !== 201 || !productBody.product?._id) {
    throw new Error(`seller2 product creation failed: ${productRes.status()} ${JSON.stringify(productBody)}`);
  }
  seller2ProductId = productBody.product._id;

  await ctx.dispose();
});

// ── TC-053 ──────────────────────────────────────────────────────────────────

test.describe('TC-053: Buyer is blocked from seller-only routes', () => {
  test('PUT /api/seller/orders/:id/status returns 403 for buyer token', async ({ request }) => {
    const res = await request.put('/api/seller/orders/000000000000000000000000/status', {
      data: { status: 'processing' },
      headers: authHeaders(freshBuyerToken),
    });
    expect(res.status()).toBe(403);
  });
});

// ── TC-054 ──────────────────────────────────────────────────────────────────

test.describe('TC-054: Seller cannot edit another sellers product', () => {
  test('PUT /api/products/:id returns 403 when seller does not own the product', async ({ request }) => {
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
});

// ── TC-048 ──────────────────────────────────────────────────────────────────

test.describe('TC-048: Invalid seller order status transition returns 400', () => {
  test('skipping from pending directly to shipped returns 400', async ({ request }) => {
    // Create a fresh order as buyer
    const orderRes = await request.post('/api/orders', {
      data: {
        items: [{ productId: seller1ProductId, quantity: 1 }],
        shippingAddress: ADDR,
        paymentMethod: COD,
      },
      headers: authHeaders(freshBuyerToken),
    });
    expect(orderRes.status()).toBe(201);
    const orderId = (await orderRes.json()).orders[0]._id;

    // Attempt invalid transition: pending → shipped (skips preparing + processing)
    const res = await request.put(`/api/seller/orders/${orderId}/status`, {
      data: { status: 'shipped' },
      headers: authHeaders(seller1Token),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/Cannot transition order from 'pending' to 'shipped'/i);
  });
});
