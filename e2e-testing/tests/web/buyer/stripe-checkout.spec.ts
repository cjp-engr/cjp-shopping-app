// Card payment through Stripe, on whichever checkout flow the run uses (CHECKOUT_FLOW).
//
// legacy:         the card is charged when the order is placed (PaymentIntent succeeds).
// manual_capture: the card is held when the order is placed (PaymentIntent requires_capture);
//                 nothing is captured until the seller starts preparing the order.
//
// Success means the buyer lands on the orders page with the order placed. Under manual_capture
// the order must also show its payment as authorized.

import type { Page } from '@playwright/test';

import type { CartPage } from '../../../pages/cart.page';
import type { CheckoutPage } from '../../../pages/checkout.page';
import type { ProductDetailPage } from '../../../pages/product-detail.page';
import { API_URL, DEFAULT_SHIPPING_ADDRESS } from '../../../helpers/test-data';
import { clearBuyerCart } from '../../../helpers/auth-state';
import {
  IS_MANUAL_CAPTURE,
  STRIPE_TEST_CARDS,
  createProductsFromTwoSellers,
  fetchBuyerOrders,
  ordersForProducts,
} from '../../../helpers/checkout-flow';
import { test, expect } from '../../../fixtures/base-fixture';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ request }) => {
  await clearBuyerCart(request, API_URL);
});

async function addOneProductAndOpenCheckout(
  page: Page,
  productId: string,
  productDetailPage: ProductDetailPage,
  cartPage: CartPage,
  checkoutPage: CheckoutPage,
): Promise<void> {
  await page.goto(`/products/${productId}`);
  await productDetailPage.root.waitFor();
  await productDetailPage.addToCart();
  await cartPage.open();
  await cartPage.proceedToCheckout();
  await checkoutPage.root.waitFor();
}

// TC-STRIPE-01: successful card payment
test('TC-STRIPE-01: card payment succeeds and the order is placed',
  { tag: ['@TC-STRIPE-01', '@buyer', '@checkout', '@stripe'] },
  async ({ page, request, productDetailPage, cartPage, checkoutPage }) => {
    const [productId] = await createProductsFromTwoSellers(request);

    await test.step('Enter shipping and a test card that succeeds', async () => {
      await addOneProductAndOpenCheckout(page, productId, productDetailPage, cartPage, checkoutPage);
      await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
      await checkoutPage.continueToPayment();
      await checkoutPage.fillStripeCard(STRIPE_TEST_CARDS.success);
      await checkoutPage.continueToReview();
    });

    await test.step('Place the order and land on the orders page', async () => {
      await checkoutPage.placeOrder();
      await expect(page).toHaveURL(/\/orders/, { timeout: 60_000 });
      await expect(page.getByTestId('orders-page')).toBeVisible();
    });

    if (IS_MANUAL_CAPTURE) {
      await test.step('Under manual capture the payment is reserved, not charged', async () => {
        const [order] = ordersForProducts(await fetchBuyerOrders(request), [productId]);
        expect(order).toMatchObject({ paymentFlowVersion: 'manual_capture', paymentStatus: 'authorized' });
      });
    }
  });

// TC-STRIPE-02: declined card shows an error and keeps the buyer on the payment step
test('TC-STRIPE-02: declined card shows the decline message and stays on review',
  { tag: ['@TC-STRIPE-02', '@buyer', '@checkout', '@stripe'] },
  async ({ page, request, productDetailPage, cartPage, checkoutPage }) => {
    const [productId] = await createProductsFromTwoSellers(request);

    await addOneProductAndOpenCheckout(page, productId, productDetailPage, cartPage, checkoutPage);
    await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
    await checkoutPage.continueToPayment();
    await checkoutPage.fillStripeCard(STRIPE_TEST_CARDS.declined);
    await checkoutPage.continueToReview();
    await checkoutPage.placeOrder();

    await expect(page.getByText(/declined/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(checkoutPage.placeOrderButton).toBeVisible();
    await expect(page).not.toHaveURL(/\/orders/);
  });

// TC-STRIPE-04: the Stripe card element renders once the payment step is reached
test('TC-STRIPE-04: the Stripe card element renders on the payment step',
  { tag: ['@TC-STRIPE-04', '@buyer', '@checkout', '@stripe'] },
  async ({ page, request, productDetailPage, cartPage, checkoutPage }) => {
    const [productId] = await createProductsFromTwoSellers(request);

    await addOneProductAndOpenCheckout(page, productId, productDetailPage, cartPage, checkoutPage);
    await checkoutPage.fillNewShippingAddress(DEFAULT_SHIPPING_ADDRESS);
    await checkoutPage.continueToPayment();
    await checkoutPage.selectPaymentMethod('credit-card');

    await expect(
      page.frameLocator('iframe[name*="__privateStripeFrame"]').first().locator('[placeholder="Card number"]'),
    ).toBeVisible({ timeout: 8_000 });
  });
