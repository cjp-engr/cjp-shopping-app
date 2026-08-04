// TC coverage: TC-022 — Checkout with Cash on Delivery
//              TC-023 — Checkout with saved credit card
//              TC-024 — Checkout with new card entry

import { clearBuyerCart, getBuyerToken } from '../../../helpers/auth-state';
import { API_URL, DEFAULT_SHIPPING_ADDRESS } from '../../../helpers/test-data';
import { test, expect } from '../../../fixtures/base-fixture';

// All tests mutate the same buyer's server-side cart — run sequentially to avoid races
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ request }) => {
  await clearBuyerCart(request, API_URL);
});

test.describe('TC-022: Checkout COD', () => {
  test('buyer completes checkout with Cash on Delivery',
    {
      tag: ['@smoke', '@checkout'],
    },
    async ({
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
      await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
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
  test('buyer completes checkout with saved credit card',
    {
      tag: ['@smoke', '@checkout'],
    },
    async ({
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
      await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
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
  test('buyer completes checkout with new card entry',
    {
      tag: ['@smoke', '@checkout'],
    },
    async ({
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
      await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
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
