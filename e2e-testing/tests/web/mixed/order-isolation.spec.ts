// TC coverage: TC-112 (order history isolation — buyer2 sees only own orders in UI, not buyer1's)

import { test, expect } from '../../../fixtures/base-fixture';
import { request as pwRequest, APIRequestContext } from '@playwright/test';
import { authHeaders, login, TEST_EMAIL, TEST_PASSWORD, SELLER_EMAIL, PASSWORD } from '../../../helpers/api-client';
import { injectAuth } from '../../../helpers/auth-inject';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400';
const ADDR = { street: '123 Test St', city: 'Austin', state: 'TX', zipCode: '78701', country: 'US' };
const COD  = { type: 'cash-on-delivery' };

let buyer1OrderId: string;
let buyer2Token: string;
let buyer2UserData: Record<string, unknown>;

test.beforeAll(async () => {
  const ctx: APIRequestContext = await pwRequest.newContext({ baseURL: API_URL });

  // Buyer1 — seeded account; place an order
  const buyer1Token = await login(ctx, TEST_EMAIL, TEST_PASSWORD);
  const sellerToken = await login(ctx, SELLER_EMAIL, PASSWORD);

  const ts = Date.now();
  const productRes = await ctx.post('/api/seller/products', {
    multipart: {
      name: `Order Isolation Web Test Product ${ts}`,
      description: 'TC-112 test product',
      price: '25',
      category: 'Electronics',
      stock: '10',
      image: PLACEHOLDER_IMAGE,
    },
    headers: authHeaders(sellerToken),
  });
  const productId = (await productRes.json()).product._id;

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

  // Buyer2 — fresh account with no orders
  const signupRes = await ctx.post('/api/auth/signup', {
    data: {
      firstName: 'OrderIsolation',
      lastName: 'WebBuyer2',
      email: `order_isolation_web_buyer2_${ts}@test.com`,
      password: 'Test750!!',
    },
  });
  const signupBody = await signupRes.json();
  buyer2Token = signupBody.token;
  buyer2UserData = signupBody.user;

  await ctx.dispose();
});

test.describe('TC-112: Order history isolation — buyer2 sees only own orders in UI', () => {
  test(
    'buyer2 cannot see buyer1 order on the orders page',
    { tag: ['@TC-112', '@buyer', '@order'] },
    async ({ page, myOrdersPage }) => {
      await page.goto('/');
      await injectAuth(page, buyer2Token, buyer2UserData);

      await myOrdersPage.open();

      await expect(myOrdersPage.orderCard(buyer1OrderId)).not.toBeVisible();
    },
  );
});
