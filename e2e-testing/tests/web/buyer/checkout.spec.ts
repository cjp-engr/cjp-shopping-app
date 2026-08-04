// TC coverage: TC-022 — Complete checkout with Cash on Delivery (S1)

import { test, expect } from '../../../fixtures/base-fixture';

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
