// TC coverage: TC-026 (order total formula, incl. product discount + coupon),
//              TC-027 (shipping $9.99 < $50), TC-028 (free shipping >= $50),
//              TC-263 (free-shipping boundary at $50), TC-056 (insufficient stock → 400),
//              TC-033 (buyer cancel processing order → 409 for COD),
//              TC-025 (multi-seller checkout → 2 orders)

import { test, expect, request as pwRequest } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import {
  authHeaders, login, signupFreshUser,
  SELLER_EMAIL, TEST_PASSWORD,
  BUYER_EMAIL,
} from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const ADDR = { street: '123 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' };
const COD  = { type: 'cash-on-delivery' };
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';

let buyerToken: string;
let sellerToken: string;
let sellerId: string;
let seller2Token: string;
let cheapProductId: string;          // $20
let expensiveProductId: string;      // $99
let justUnderProductId: string;      // $49.99
let atThresholdProductId: string;    // $50.00
let discountedProductId: string;     // $100 with 10% product discount
let couponId: string;
let couponCode: string;
let seller2ProductId: string;

// Everything the run creates, removed in afterAll so repeated runs leave nothing behind
const createdOrderIds: string[] = [];
const sellerProducts: { id: string; token: () => string }[] = [];

async function createProduct(
  ctx: APIRequestContext,
  token: string,
  name: string,
  price: string,
  stock: string,
  extra: Record<string, string> = {},
): Promise<string> {
  // No shippingFee field, so the default $9.99 / free-over-$50 rule applies deterministically
  const res = await ctx.post('/api/seller/products', {
    multipart: {
      name,
      description: `${name} — created by orders.api.spec.ts`,
      price,
      category: 'Electronics',
      stock,
      image: PLACEHOLDER_IMAGE,
      ...extra,
    },
    headers: authHeaders(token),
  });
  const body = await res.json();
  if (!res.ok() || !body.product?._id) {
    throw new Error(`product creation failed (${name}): ${res.status()} ${JSON.stringify(body)}`);
  }
  return body.product._id as string;
}

async function placeOrder(
  request: APIRequestContext,
  items: { productId: string; quantity: number }[],
  extra: Record<string, unknown> = {},
) {
  const res = await request.post('/api/orders', {
    data: { items, shippingAddress: ADDR, paymentMethod: COD, ...extra },
    headers: authHeaders(buyerToken),
  });
  expect(res.status()).toBe(201);
  const { orders } = await res.json();
  for (const o of orders) createdOrderIds.push(o._id);
  return orders as any[];
}

/** The persisted breakdown must satisfy tax = 8% of the after-discount amount and total = after-discount + tax + shipping. */
function expectBreakdownConsistent(o: any) {
  const afterDiscounts = o.subtotal - o.productDiscount - o.discount;
  expect(o.tax).toBeCloseTo(afterDiscounts * 0.08, 2);
  expect(o.total).toBeCloseTo(afterDiscounts + o.tax + o.shipping, 2);
}

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });

  // The buyer is a fresh account, so the seller is not buying their own products
  ({ token: buyerToken } = await signupFreshUser(ctx, 'orders_buyer'));
  sellerToken = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);

  const meRes = await ctx.get('/api/auth/me', { headers: authHeaders(sellerToken) });
  const { user } = await meRes.json();
  sellerId = user._id ?? user.id;

  const ts = Date.now();
  const make = async (name: string, price: string, stock: string, extra: Record<string, string> = {}) => {
    const id = await createProduct(ctx, sellerToken, `${name} ${ts}`, price, stock, extra);
    sellerProducts.push({ id, token: () => sellerToken });
    return id;
  };
  cheapProductId       = await make('API Cheap', '20', '50');
  expensiveProductId   = await make('API Expensive', '99', '20');
  justUnderProductId   = await make('API Just Under 50', '49.99', '20');
  atThresholdProductId = await make('API At 50', '50', '20');
  discountedProductId  = await make('API Discounted', '100', '20', { discount: '10' });

  // 10% coupon for this seller, used by the discount + coupon case of TC-026
  couponCode = `ORDAPI${ts}`;
  const couponRes = await ctx.post('/api/coupons/seller', {
    data: { code: couponCode, discountType: 'percentage', discountValue: 10 },
    headers: authHeaders(sellerToken),
  });
  expect(couponRes.status()).toBe(201);
  const { coupon } = await couponRes.json();
  couponId = coupon._id ?? coupon.id;

  await ctx.dispose();
});

test.afterAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });
  const failures: string[] = [];

  // Cancel orders first (restores stock). The buyer can cancel pending orders; an order the test
  // advanced past pending is cancelled by its seller instead.
  for (const orderId of createdOrderIds) {
    const byBuyer = await ctx.put(`/api/orders/${orderId}/status`, {
      data: { status: 'cancelled' },
      headers: authHeaders(buyerToken),
    });
    if (byBuyer.ok()) continue;
    let cancelled = false;
    for (const token of [sellerToken, seller2Token].filter(Boolean)) {
      const bySeller = await ctx.put(`/api/seller/orders/${orderId}/status`, {
        data: { status: 'cancelled', cancelReason: 'API test cleanup' },
        headers: authHeaders(token),
      });
      if (bySeller.ok()) { cancelled = true; break; }
    }
    if (!cancelled) failures.push(`order ${orderId}`);
  }

  for (const p of sellerProducts) {
    const res = await ctx.delete(`/api/seller/products/${p.id}`, { headers: authHeaders(p.token()) });
    if (!res.ok()) failures.push(`product ${p.id}`);
  }
  if (couponId) {
    const res = await ctx.delete(`/api/coupons/seller/${couponId}`, { headers: authHeaders(sellerToken) });
    if (!res.ok()) failures.push(`coupon ${couponId}`);
  }

  await ctx.dispose();
  expect(failures, 'cleanup should remove everything the run created').toEqual([]);
});

// ── TC-026 ──────────────────────────────────────────────────────────────────

test.describe('TC-026: Order total matches pricing formula', () => {
  test(
    'tax is 8% of after-discount subtotal; total = afterDiscounts + tax + shipping',
    { tag: ['@TC-026', '@api', '@orders', '@pricing'] },
    async ({ request }) => {
      await test.step('Place order with the $20 product', async () => {
        const [o] = await placeOrder(request, [{ productId: cheapProductId, quantity: 1 }]);

        await test.step('Assert the exact amounts for a $20 product with default shipping', async () => {
          expect(o.subtotal).toBe(20);
          expect(o.productDiscount).toBe(0);
          expect(o.discount).toBe(0);
          expect(o.tax).toBeCloseTo(1.6, 2);
          expect(o.shipping).toBe(9.99);
          expect(o.total).toBeCloseTo(31.59, 2);
        });

        await test.step('Assert tax = 8% of after-discount subtotal and total formula', async () => {
          expectBreakdownConsistent(o);
        });
      });
    },
  );

  test(
    'product discount then coupon are applied before tax and shipping',
    { tag: ['@TC-026', '@api', '@orders', '@pricing', '@coupons'] },
    async ({ request }) => {
      await test.step('Place order with a $100 product (10% off) and a 10% seller coupon', async () => {
        const [o] = await placeOrder(
          request,
          [{ productId: discountedProductId, quantity: 1 }],
          { couponCodes: { [sellerId]: couponCode } },
        );

        await test.step('Assert $100 → 10% product discount → 10% coupon on $90 → tax → free shipping', async () => {
          expect(o.subtotal).toBe(100);
          expect(o.productDiscount).toBeCloseTo(10, 2);
          expect(o.discount).toBeCloseTo(9, 2);          // 10% of the $90 effective subtotal
          expect(o.tax).toBeCloseTo(6.48, 2);            // 8% of $81
          expect(o.shipping).toBe(0);                    // $81 >= $50
          expect(o.total).toBeCloseTo(87.48, 2);
          expectBreakdownConsistent(o);
        });
      });
    },
  );
});

// ── TC-027 ──────────────────────────────────────────────────────────────────

test.describe('TC-027: Shipping $9.99 when effective subtotal < $50', () => {
  test(
    'order with cheap product gets $9.99 default shipping',
    { tag: ['@TC-027', '@api', '@orders', '@pricing'] },
    async ({ request }) => {
      await test.step('Place order with $20 product (subtotal < $50)', async () => {
        const [o] = await placeOrder(request, [{ productId: cheapProductId, quantity: 1 }]);
        const afterDiscounts = o.subtotal - o.productDiscount - o.discount;

        await test.step('Assert effective subtotal < $50 and shipping = $9.99', async () => {
          expect(afterDiscounts).toBeLessThan(50);
          expect(o.shipping).toBe(9.99);
        });
      });
    },
  );
});

// ── TC-028 ──────────────────────────────────────────────────────────────────

test.describe('TC-028: Free shipping when effective subtotal >= $50', () => {
  test(
    'order with expensive product gets $0 shipping',
    { tag: ['@TC-028', '@api', '@orders', '@pricing'] },
    async ({ request }) => {
      await test.step('Place order with $99 product (subtotal >= $50)', async () => {
        const [o] = await placeOrder(request, [{ productId: expensiveProductId, quantity: 1 }]);
        const afterDiscounts = o.subtotal - o.productDiscount - o.discount;

        await test.step('Assert effective subtotal >= $50 and shipping = $0', async () => {
          expect(afterDiscounts).toBeGreaterThanOrEqual(50);
          expect(o.shipping).toBe(0);
        });
      });
    },
  );
});

// ── TC-263 ──────────────────────────────────────────────────────────────────

test.describe('TC-263: Free-shipping boundary at $50', () => {
  test(
    '$49.99 pays $9.99 shipping and $50.00 ships free',
    { tag: ['@TC-263', '@TC-027', '@TC-028', '@api', '@orders', '@pricing'] },
    async ({ request }) => {
      await test.step('Place order with a $49.99 product and assert shipping = $9.99', async () => {
        const [o] = await placeOrder(request, [{ productId: justUnderProductId, quantity: 1 }]);
        expect(o.subtotal).toBeCloseTo(49.99, 2);
        expect(o.shipping).toBe(9.99);
      });

      await test.step('Place order with a $50.00 product and assert shipping = $0', async () => {
        const [o] = await placeOrder(request, [{ productId: atThresholdProductId, quantity: 1 }]);
        expect(o.subtotal).toBe(50);
        expect(o.shipping).toBe(0);
      });
    },
  );
});

// ── TC-056 ──────────────────────────────────────────────────────────────────

test.describe('TC-056: Insufficient stock at checkout returns 400', () => {
  test(
    'POST /api/orders returns 400 when quantity exceeds stock',
    { tag: ['@TC-056', '@api', '@orders', '@stock'] },
    async ({ request }) => {
      await test.step('Place order with quantity 99999 (far exceeds stock)', async () => {
        const res = await request.post('/api/orders', {
          data: { items: [{ productId: cheapProductId, quantity: 99999 }], shippingAddress: ADDR, paymentMethod: COD },
          headers: authHeaders(buyerToken),
        });
        expect(res.status()).toBe(400);

        await test.step('Assert 400 with insufficient stock message', async () => {
          const body = await res.json();
          expect(body.message).toMatch(/insufficient stock/i);
        });
      });
    },
  );
});

// ── TC-033 ──────────────────────────────────────────────────────────────────

test.describe('TC-033: Buyer cannot cancel a processing order', () => {
  test(
    'PUT /api/orders/:id/status is refused when the COD order is in processing',
    { tag: ['@TC-033', '@api', '@orders', '@cancellation'] },
    async ({ request }) => {
      let orderId: string;

      await test.step('Place order as buyer', async () => {
        const [o] = await placeOrder(request, [{ productId: cheapProductId, quantity: 1 }]);
        orderId = o._id;
      });

      await test.step('Advance order to processing via seller (pending → preparing → processing)', async () => {
        for (const status of ['preparing', 'processing']) {
          const res = await request.put(`/api/seller/orders/${orderId}/status`, {
            data: { status },
            headers: authHeaders(sellerToken),
          });
          expect(res.status(), `seller move to ${status}`).toBe(200);
        }
      });

      await test.step('Attempt buyer cancel and assert 409 cancellation_conflict', async () => {
        // COD orders carry paymentStatus "not_required", so cancellation goes through the shared atomic claim
        // and a non-pending order answers 409 (legacy-shaped orders still answer 400).
        const cancelRes = await request.put(`/api/orders/${orderId}/status`, {
          data: { cancelReason: 'Changed my mind' },
          headers: authHeaders(buyerToken),
        });
        expect(cancelRes.status()).toBe(409);
        const body = await cancelRes.json();
        expect(body.code).toBe('cancellation_conflict');
      });
    },
  );
});

// ── TC-025 ──────────────────────────────────────────────────────────────────

test.describe('TC-025: Multi-seller checkout creates separate orders', () => {
  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext({ baseURL: API_URL });

    // Promote the second account to seller (idempotent; shared with the other seller-access specs)
    seller2Token = await login(ctx, BUYER_EMAIL, TEST_PASSWORD);
    await ctx.put('/api/auth/profile', {
      data: { role: 'seller' },
      headers: authHeaders(seller2Token),
    });

    seller2ProductId = await createProduct(ctx, seller2Token, `Multi-Seller API Test Product ${Date.now()}`, '25', '20');
    sellerProducts.push({ id: seller2ProductId, token: () => seller2Token });

    await ctx.dispose();
  });

  test(
    'cart with items from 2 sellers creates 2 separate orders',
    { tag: ['@TC-025', '@api', '@orders', '@multi-seller'] },
    async ({ request }) => {
      await test.step('Place order with items from seller1 and seller2', async () => {
        const orders = await placeOrder(request, [
          { productId: cheapProductId,   quantity: 1 },
          { productId: seller2ProductId, quantity: 1 },
        ]);

        await test.step('Assert two separate orders are created', async () => {
          expect(orders).toHaveLength(2);
          expect(orders[0]._id).not.toBe(orders[1]._id);
        });

        await test.step('Assert each order holds only its own seller\'s product and its own totals', async () => {
          const productIdsPerOrder = orders.map(o =>
            o.items.map((i: any) => i.product?._id ?? i.product?.toString()),
          );
          expect(productIdsPerOrder.every(ids => ids.length === 1)).toBe(true);
          expect(productIdsPerOrder.flat().sort()).toEqual([cheapProductId, seller2ProductId].sort());

          // Orders belong to different sellers
          expect(new Set(orders.map(o => o.sellerId)).size).toBe(2);

          // Each order is priced on its own: $20 and $25 are both under the free-shipping threshold
          for (const o of orders) {
            expect(o.shipping).toBe(9.99);
            expectBreakdownConsistent(o);
          }
          const subtotals = orders.map(o => o.subtotal).sort((a, b) => a - b);
          expect(subtotals).toEqual([20, 25]);
        });
      });
    },
  );
});
