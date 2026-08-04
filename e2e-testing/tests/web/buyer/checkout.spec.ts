// TC coverage: TC-022 — Checkout with Cash on Delivery
//              TC-023 — Checkout with saved credit card
//              TC-024 — Checkout with new card entry

import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../fixtures/base-fixture';

// All tests mutate the same buyer's server-side cart — run sequentially to avoid races
test.describe.configure({ mode: 'serial' });

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

/** Read the buyer's auth token from the saved storageState on disk. */
function getBuyerToken(): string {
  const statePath = path.join(__dirname, '../../../.auth/buyer.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const entry = state.origins?.[0]?.localStorage?.find(
    (e: { name: string; value: string }) => e.name === 'shopping_app_auth_token',
  );
  if (!entry?.value) throw new Error('Buyer auth token not found in .auth/buyer.json');
  return entry.value;
}

// Clear any leftover cart items before each test (cart persists across runs)
test.beforeEach(async ({ request }) => {
  const token = getBuyerToken();
  await request.delete(`${API_URL}/api/cart`, {
    headers: { Authorization: `Bearer ${token}` },
  });
});

const SHIPPING_ADDRESS = {
  street: '123 Test Street',
  city: 'Manila',
  state: 'Metro Manila',
  zip: '1000',
  phone: '+63 912 345 6789',
};

test.describe('TC-022: Checkout COD', () => {
  test('buyer completes checkout with Cash on Delivery', async ({
    page,
    productListPage,
    productDetailPage,
    cartPage,
    checkoutPage,
  }) => {
    // Auth already applied via .auth/buyer.json — no login step needed
    await productListPage.goto();

    // Add first available product to cart
    await productListPage.clickFirstProduct();
    await productDetailPage.root.waitFor();
    await productDetailPage.addToCart();

    // Open cart and proceed to checkout
    await cartPage.open();
    await cartPage.proceedToCheckout();
    await checkoutPage.root.waitFor();

    // Fill shipping, select COD, place order
    await checkoutPage.fillNewShippingAddress(SHIPPING_ADDRESS);
    await checkoutPage.continueToPayment();
    await checkoutPage.selectPaymentMethod('cash-on-delivery');
    await checkoutPage.continueToReview();
    await checkoutPage.placeOrder();

    // Assert: redirected to orders page
    await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 });
    await expect(page.getByTestId('orders-page')).toBeVisible();
  });
});


test.describe('TC-023: Checkout with saved credit card', () => {
  test('buyer completes checkout with saved credit card', async ({
    page,
    request,
    productListPage,
    productDetailPage,
    cartPage,
    checkoutPage,
  }) => {
    // Precondition: ensure buyer has at least one saved card (idempotent — duplicate check in API)
    // Token is read from disk to avoid SecurityError on about:blank before any navigation
    const token = getBuyerToken();
    await request.post(`${API_URL}/api/auth/payment-methods`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        type: 'credit-card',
        last4: '4242',
        cardHolder: 'Test Buyer',
        expiryMonth: '12',
        expiryYear: '2028',
        setAsDefault: true,
      },
    });

    // Auth context re-fetches user (including savedCards) on page mount
    await productListPage.goto();

    // Add first available product to cart
    await productListPage.clickFirstProduct();
    await productDetailPage.root.waitFor();
    await productDetailPage.addToCart();

    // Open cart and proceed to checkout
    await cartPage.open();
    await cartPage.proceedToCheckout();
    await checkoutPage.root.waitFor();

    // Fill shipping; payment section starts in saved-card mode (first card auto-selected)
    await checkoutPage.fillNewShippingAddress(SHIPPING_ADDRESS);
    await checkoutPage.continueToPayment();
    await checkoutPage.selectSavedCard();
    await checkoutPage.continueToReview();
    await checkoutPage.placeOrder();

    // Assert: redirected to orders page
    await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 });
    await expect(page.getByTestId('orders-page')).toBeVisible();
  });
});

test.describe('TC-024: Checkout with new card entry', () => {
  test('buyer completes checkout with new card entry', async ({
    page,
    productListPage,
    productDetailPage,
    cartPage,
    checkoutPage,
  }) => {
    // Auth already applied via .auth/buyer.json — no login step needed
    await productListPage.goto();

    // Add first available product to cart
    await productListPage.clickFirstProduct();
    await productDetailPage.root.waitFor();
    await productDetailPage.addToCart();

    // Open cart and proceed to checkout
    await cartPage.open();
    await cartPage.proceedToCheckout();
    await checkoutPage.root.waitFor();

    // Fill shipping, enter new credit card details, place order
    await checkoutPage.fillNewShippingAddress(SHIPPING_ADDRESS);
    await checkoutPage.continueToPayment();
    await checkoutPage.fillNewCardForm({
      type: 'credit-card',
      cardNumber: '4111111111111111',
      cardHolder: 'Test Buyer',
      expiryMonth: '12',
      expiryYear: String(new Date().getFullYear() + 2),
      cvv: '123',
    });
    await checkoutPage.continueToReview();
    await checkoutPage.placeOrder();

    // Assert: redirected to orders page
    await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 });
    await expect(page.getByTestId('orders-page')).toBeVisible();
  });
});
