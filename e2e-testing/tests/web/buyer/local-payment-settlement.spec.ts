// TC coverage: TC-AUTH-03 — per-seller authorization; local acceptance, cancellation and expiry verification.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test, expect } from '../../../fixtures/base-fixture';
import { clearBuyerCart, getBuyerToken } from '../../../helpers/auth-state';
import { API_URL, DEFAULT_SHIPPING_ADDRESS } from '../../../helpers/test-data';
import { TEST_PASSWORD } from '../../../helpers/api-client';
import {
  createProductsFromTwoSellers,
  ensureSavedStripeCard,
  fetchBuyerOrders,
  ordersForProducts,
} from '../../../helpers/checkout-flow';

test.skip(process.env.LOCAL_PAYMENT_VERIFICATION !== 'true', 'Opt-in local Stripe test verification only');
test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);
test.beforeEach(async ({ request }) => {
  const web = new URL(process.env.WEB_URL ?? '');
  const api = new URL(API_URL);
  if (!['localhost', '127.0.0.1'].includes(web.hostname) || web.port !== '5173') {
    throw new Error('Local verification web on port 5173 required');
  }
  if (!['localhost', '127.0.0.1'].includes(api.hostname) || api.port !== '5001') {
    throw new Error('Isolated local verification API on port 5001 required');
  }
  await clearBuyerCart(request, API_URL);
});

test('saved-card two-seller purchase: accept one seller and cancel the other through the UI', async ({ page, browser, request, productDetailPage, cartPage, checkoutPage }) => {
  const products = await createProductsFromTwoSellers(request);
  await ensureSavedStripeCard(request);
  for (const id of products) {
    await productDetailPage.goto(id);
    await productDetailPage.addToCart();
  }
  await cartPage.open();
  await cartPage.proceedToCheckout();
  await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
  await checkoutPage.continueToPayment();
  await checkoutPage.selectSavedCard();
  await checkoutPage.continueToReview();
  await checkoutPage.placeOrder();
  await expect(page).toHaveURL(/\/orders/, { timeout: 60000 });
  const orders = ordersForProducts(await fetchBuyerOrders(request), products);
  expect(orders).toHaveLength(2);
  const [accepted] = ordersForProducts(orders, [products[0]]);
  const [cancelled] = ordersForProducts(orders, [products[1]]);
  const login = await request.post(`${API_URL}/api/auth/login`, {
    data: { email: 's1@ex.com', password: TEST_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();
  const seller = await login.json();
  const origin = new URL(process.env.WEB_URL!).origin;
  const sellerPage = await browser.newPage({
    baseURL: origin,
    storageState: {
      cookies: [],
      origins: [{
        origin,
        localStorage: [
          { name: 'shopping_app_auth_token', value: seller.token },
          { name: 'shopping_app_user_data', value: JSON.stringify(seller.user) },
        ],
      }],
    },
  });
  try {
    await sellerPage.goto(`/seller/orders/${accepted._id}`);
    await sellerPage.getByRole('button', { name: 'Prepare order', exact: true }).click();
    await expect(sellerPage.getByTestId('seller-order-status-badge'))
      .toContainText('Preparing', { timeout: 30000 });
  } finally {
    await sellerPage.close();
  }
  await page.reload();
  await page.getByTestId(`order-card-${cancelled._id}`)
    .getByRole('button', { name: 'Cancel Order', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, Cancel Order', exact: true }).click();
  await expect.poll(async () =>
    (await fetchBuyerOrders(request)).find(order => order._id === cancelled._id)?.paymentStatus,
  ).toBe('released');
  await page.goto(`/orders/${cancelled._id}`);
  await expect(page.getByText('Reservation released', { exact: true })).toBeVisible();
  await page.goto(`/orders/${accepted._id}`);
  await expect(page.getByText('Payment charged', { exact: true })).toBeVisible();
  console.log(JSON.stringify({ verified: 'web-settlement', acceptedOrder: accepted._id, cancelledOrder: cancelled._id }));
});

test('accelerated local order expiry releases its actual Stripe authorization', async ({ page, request, productDetailPage, cartPage, checkoutPage }) => {
  const [product] = await createProductsFromTwoSellers(request);
  await ensureSavedStripeCard(request);
  await productDetailPage.goto(product);
  await productDetailPage.addToCart();
  await cartPage.open();
  await cartPage.proceedToCheckout();
  await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
  await checkoutPage.continueToPayment();
  await checkoutPage.selectSavedCard();
  await checkoutPage.continueToReview();
  await checkoutPage.placeOrder();
  await expect(page).toHaveURL(/\/orders/, { timeout: 60000 });
  const [order] = ordersForProducts(await fetchBuyerOrders(request), [product]);
  execFileSync(process.execPath, [
    '--import', 'tsx', 'scripts/local-payment-evidence.mjs', 'expire', order._id,
  ], { cwd: path.resolve(__dirname, '../../../../backend') });
  await expect.poll(async () => {
    const response = await request.get(`${API_URL}/api/orders/${order._id}`, {
      headers: { Authorization: `Bearer ${getBuyerToken()}` },
    });
    return (await response.json()).order?.paymentStatus;
  }, { timeout: 90000, intervals: [1000, 3000, 5000] }).toBe('released');
  await page.goto(`/orders/${order._id}`);
  await expect(page.getByText('Reservation released', { exact: true })).toBeVisible();
  console.log(JSON.stringify({ verified: 'web-accelerated-expiry', orderId: order._id }));
});
