// TC coverage: TC-057 (coupon below minimum order amount → 400)

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  authHeaders, login,
  SELLER_EMAIL, TEST_PASSWORD,
  SELLER_EMAIL, TEST_PASSWORD,
} from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

let buyerToken: string;
let sellerToken: string;
let sellerId: string;
let couponCode: string;

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  buyerToken  = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);
  sellerToken = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);

  // Resolve seller ID
  const meRes = await ctx.get('/api/auth/me', { headers: authHeaders(sellerToken) });
  const { user } = await meRes.json();
  sellerId = user._id ?? user.id;

  // Create a coupon with a $100 minimum order amount
  const code = `MINTEST${Date.now()}`;
  const couponRes = await ctx.post('/api/coupons/seller', {
    data: {
      code,
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 100,
      description: 'TC-057 min-order test coupon',
    },
    headers: authHeaders(sellerToken),
  });
  expect(couponRes.status()).toBe(201);
  couponCode = code;

  await ctx.dispose();
});

// ── TC-057 ──────────────────────────────────────────────────────────────────

test.describe('TC-057: Coupon rejected when order is below minimum amount', () => {
  test('POST /api/coupons/validate returns 400 when orderAmount < minOrderAmount', async ({ request }) => {
    const res = await request.post('/api/coupons/validate', {
      data: {
        code: couponCode,
        sellerId,
        orderAmount: 10,   // well below the $100 minimum
      },
      headers: authHeaders(buyerToken),
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/minimum order/i);
  });
});
