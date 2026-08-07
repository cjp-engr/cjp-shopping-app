// TC coverage: TC-120 — Protected routes return 401 with no token
//              TC-121 — Tampered JWT returns 401
//              TC-122 — Seller order list is scoped to own account (IDOR)
//              TC-123 — Buyer blocked from all key seller routes (extends TC-053)
//              TC-124 — Weak password on signup returns 400

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders,
  login,
  signupFreshUser,
  SELLER_EMAIL,
  BUYER_EMAIL,
  PASSWORD,
} from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let freshBuyerToken: string;
let seller1Token: string;
let seller2Token: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  seller1Token = await login(ctx, SELLER_EMAIL, PASSWORD);

  // Promote seeded buyer to seller2 (idempotent)
  seller2Token = await login(ctx, BUYER_EMAIL, PASSWORD);
  await ctx.put('/api/auth/profile', {
    data: { role: 'seller' },
    headers: authHeaders(seller2Token),
  });

  // Fresh buyer — guaranteed non-seller regardless of prior test runs
  const { token } = await signupFreshUser(ctx, 'security-buyer');
  freshBuyerToken = token;

  await ctx.dispose();
});

// ── TC-120 ───────────────────────────────────────────────────────────────────

test.describe('TC-120: Protected routes return 401 with no token', () => {
  const protectedRoutes: { method: 'get' | 'put' | 'post'; path: string; label: string }[] = [
    { method: 'get',  path: '/api/auth/me',                                              label: 'GET /api/auth/me' },
    { method: 'get',  path: '/api/orders',                                               label: 'GET /api/orders' },
    { method: 'get',  path: '/api/cart',                                                 label: 'GET /api/cart' },
    { method: 'get',  path: '/api/seller/products',                                      label: 'GET /api/seller/products' },
    { method: 'put',  path: '/api/seller/orders/000000000000000000000000/status',        label: 'PUT /api/seller/orders/:id/status' },
  ];

  for (const route of protectedRoutes) {
    test(
      `${route.label} returns 401 without Authorization header`,
      { tag: ['@TC-120', '@api', '@security'] },
      async ({ request }) => {
        const res = await request[route.method](route.path);
        expect(res.status()).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      },
    );
  }
});

// ── TC-121 ───────────────────────────────────────────────────────────────────

test.describe('TC-121: Tampered JWT returns 401', () => {
  test(
    'GET /api/auth/me with a corrupted token signature returns 401',
    { tag: ['@TC-121', '@api', '@security'] },
    async ({ request }) => {
      // Corrupt the last character of the signature segment
      const validToken = freshBuyerToken;
      const parts = validToken.split('.');
      const corruptedSignature = parts[2].slice(0, -1) + (parts[2].endsWith('a') ? 'b' : 'a');
      const tamperedToken = [parts[0], parts[1], corruptedSignature].join('.');

      const res = await request.get('/api/auth/me', {
        headers: authHeaders(tamperedToken),
      });

      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    },
  );
});

// ── TC-122 ───────────────────────────────────────────────────────────────────

test.describe('TC-122: Seller order list is scoped to own account', () => {
  test(
    'GET /api/seller/orders returns only orders for seller1 products, not seller2',
    { tag: ['@TC-122', '@api', '@security'] },
    async ({ request }) => {
      const ts = Date.now();

      // Seller2 creates a product
      const productRes = await request.post('/api/seller/products', {
        multipart: {
          name: `TC-122 Seller2 Product ${ts}`,
          description: 'IDOR scoping test — must not appear in seller1 orders',
          price: '20',
          category: 'Electronics',
          stock: '10',
          image: PLACEHOLDER_IMAGE,
        },
        headers: authHeaders(seller2Token),
      });
      expect(productRes.status()).toBe(201);
      const seller2ProductId = (await productRes.json()).product._id as string;

      // Buyer places an order on seller2's product
      const orderRes = await request.post('/api/orders', {
        data: {
          items: [{ productId: seller2ProductId, quantity: 1 }],
          shippingAddress: { street: '1 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' },
          paymentMethod: { type: 'cash-on-delivery' },
        },
        headers: authHeaders(freshBuyerToken),
      });
      expect(orderRes.status()).toBe(201);
      const seller2OrderId = (await orderRes.json()).orders[0]._id as string;

      // Seller1 fetches their own orders — must not see seller2's order
      const seller1OrdersRes = await request.get('/api/seller/orders', {
        headers: authHeaders(seller1Token),
      });
      expect(seller1OrdersRes.status()).toBe(200);
      const { orders } = await seller1OrdersRes.json();
      const ids = (orders as { _id: string }[]).map(o => o._id);
      expect(ids).not.toContain(seller2OrderId);
    },
  );
});

// ── TC-123 ───────────────────────────────────────────────────────────────────

test.describe('TC-123: Buyer blocked from all key seller routes', () => {
  const sellerRoutes: { method: 'get' | 'post' | 'put'; path: string; label: string }[] = [
    { method: 'get',  path: '/api/seller/products',                                      label: 'GET /api/seller/products' },
    { method: 'post', path: '/api/seller/products',                                      label: 'POST /api/seller/products' },
    { method: 'get',  path: '/api/seller/orders',                                        label: 'GET /api/seller/orders' },
    { method: 'put',  path: '/api/seller/orders/000000000000000000000000/status',        label: 'PUT /api/seller/orders/:id/status' },
  ];

  for (const route of sellerRoutes) {
    test(
      `${route.label} returns 403 for buyer token`,
      { tag: ['@TC-123', '@api', '@security'] },
      async ({ request }) => {
        const res = await request[route.method](route.path, {
          headers: authHeaders(freshBuyerToken),
        });
        expect(res.status()).toBe(403);
        const body = await res.json();
        expect(body.success).toBe(false);
      },
    );
  }
});

// ── TC-124 ───────────────────────────────────────────────────────────────────

test.describe('TC-124: Weak password on signup returns 400', () => {
  test(
    'POST /api/auth/signup with a 3-character password returns 400',
    { tag: ['@TC-124', '@api', '@security'] },
    async ({ request }) => {
      const res = await request.post('/api/auth/signup', {
        data: {
          email: `weak-pw-${Date.now()}@test.com`,
          password: 'abc',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    },
  );
});
