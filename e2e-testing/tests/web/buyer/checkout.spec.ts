// TC coverage: TC-022 — Checkout with Cash on Delivery
//              TC-023 — Checkout with saved credit card
//              TC-024 — Checkout with new card entry

import { clearBuyerCart } from '../../../helpers/auth-state';
import { API_URL, DEFAULT_SHIPPING_ADDRESS } from '../../../helpers/test-data';
import { STRIPE_TEST_CARDS, ensureSavedStripeCard } from '../../../helpers/checkout-flow';
import { test, expect } from '../../../fixtures/base-fixture';

// All tests mutate the same buyer's server-side cart — run sequentially to avoid races
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ request }) => {
  await clearBuyerCart(request, API_URL);
});

test.describe('TC-022: Checkout COD', () => {
  test('buyer completes checkout with Cash on Delivery',
    { tag: ['@TC-022', '@buyer', '@checkout', '@simple', '@smoke'] },
    async ({
      page,
      productListPage,
      productDetailPage,
      cartPage,
      checkoutPage,
    }) => {
      await test.step('Browse products and add first to cart', async () => {
        await productListPage.goto();
        await productListPage.clickFirstProduct();
        await productDetailPage.root.waitFor();
        await productDetailPage.addToCart();
      });

      await test.step('Open cart and proceed to checkout', async () => {
        await cartPage.open();
        await cartPage.proceedToCheckout();
        await checkoutPage.root.waitFor();
      });

      await test.step('Fill shipping address, select Cash on Delivery, and place order', async () => {
        await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
        await checkoutPage.continueToPayment();
        await checkoutPage.selectPaymentMethod('cash-on-delivery');
        await checkoutPage.continueToReview();
        await checkoutPage.placeOrder();
      });

      await test.step('Verify redirect to orders page', async () => {
        await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 });
        await expect(page.getByTestId('orders-page')).toBeVisible();
      });
    });
});


test.describe('TC-023: Checkout with saved credit card', () => {
  test('buyer completes checkout with saved credit card',
    { tag: ['@TC-023', '@buyer', '@checkout', '@simple', '@smoke'] },
    async ({
      page,
      request,
      productListPage,
      productDetailPage,
      cartPage,
      checkoutPage,
    }) => {
      await test.step('Ensure buyer has a saved card backed by a Stripe PaymentMethod', async () => {
        await ensureSavedStripeCard(request);
      });

      await test.step('Browse products and add first to cart', async () => {
        await productListPage.goto();
        await productListPage.clickFirstProduct();
        await productDetailPage.root.waitFor();
        await productDetailPage.addToCart();
      });

      await test.step('Open cart and proceed to checkout', async () => {
        await cartPage.open();
        await cartPage.proceedToCheckout();
        await checkoutPage.root.waitFor();
      });

      await test.step('Fill shipping address, select saved card, and place order', async () => {
        await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
        await checkoutPage.continueToPayment();
        await checkoutPage.selectSavedCard();
        await checkoutPage.continueToReview();
        await checkoutPage.placeOrder();
      });

      await test.step('Verify redirect to orders page', async () => {
        await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 });
        await expect(page.getByTestId('orders-page')).toBeVisible();
      });
    });
});

test.describe('TC-024: Checkout with new card entry', () => {
  test('buyer completes checkout with new card entry',
    { tag: ['@TC-024', '@buyer', '@checkout', '@simple', '@smoke'] },
    async ({
      page,
      productListPage,
      productDetailPage,
      cartPage,
      checkoutPage,
    }) => {
      await test.step('Browse products and add first to cart', async () => {
        await productListPage.goto();
        await productListPage.clickFirstProduct();
        await productDetailPage.root.waitFor();
        await productDetailPage.addToCart();
      });

      await test.step('Open cart and proceed to checkout', async () => {
        await cartPage.open();
        await cartPage.proceedToCheckout();
        await checkoutPage.root.waitFor();
      });

      await test.step('Fill shipping address, enter new card details, and place order', async () => {
        await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
        await checkoutPage.continueToPayment();
        await checkoutPage.fillStripeCard(STRIPE_TEST_CARDS.success);
        await checkoutPage.continueToReview();
        await checkoutPage.placeOrder();
      });

      await test.step('Verify redirect to orders page', async () => {
        await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 });
        await expect(page.getByTestId('orders-page')).toBeVisible();
      });
    });
});
