import { test, expect } from '../../../fixtures/base-fixture';

// TC-STRIPE-01: successful card payment
test('TC-STRIPE-01: card payment succeeds and shows order confirmation', async ({
  page,
  productListPage,
}) => {
  await page.goto('/');
  await productListPage.clickFirstProduct();
  await page.getByTestId('add-to-cart-btn').click();
  await page.getByTestId('cart-icon').click();
  await page.getByTestId('checkout-btn').click();

  // Step 1: fill shipping
  await page.getByTestId('street-input').fill('123 Test St');
  await page.getByTestId('city-input').fill('Manila');
  await page.getByTestId('state-input').fill('Metro Manila');
  await page.getByTestId('zip-input').fill('1000');
  await page.getByTestId('continue-to-payment-btn').click();

  // Step 2: fill card via Stripe iframe
  const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
  await cardFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
  await cardFrame.locator('[placeholder="MM / YY"]').fill('12 / 30');
  await cardFrame.locator('[placeholder="CVC"]').fill('123');
  await page.getByTestId('continue-to-review-btn').click();

  // Step 3: place order
  await page.getByTestId('place-order-btn').click();
  await expect(page.getByTestId('order-confirmation')).toBeVisible({ timeout: 15_000 });
});

// TC-STRIPE-02: declined card shows inline error
test('TC-STRIPE-02: declined card shows error and stays on payment step', async ({
  page,
  productListPage,
}) => {
  await page.goto('/');
  await productListPage.clickFirstProduct();
  await page.getByTestId('add-to-cart-btn').click();
  await page.getByTestId('cart-icon').click();
  await page.getByTestId('checkout-btn').click();

  await page.getByTestId('street-input').fill('123 Test St');
  await page.getByTestId('city-input').fill('Manila');
  await page.getByTestId('state-input').fill('Metro Manila');
  await page.getByTestId('zip-input').fill('1000');
  await page.getByTestId('continue-to-payment-btn').click();

  const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
  await cardFrame.locator('[placeholder="Card number"]').fill('4000000000000002');
  await cardFrame.locator('[placeholder="MM / YY"]').fill('12 / 30');
  await cardFrame.locator('[placeholder="CVC"]').fill('123');
  await page.getByTestId('continue-to-review-btn').click();

  await expect(page.getByText('Your card has been declined')).toBeVisible({ timeout: 10_000 });
  // Still on payment step
  await expect(page.getByTestId('continue-to-review-btn')).toBeVisible();
});

// TC-STRIPE-04: mocked create-intent for fast flow test (no real Stripe call)
test('TC-STRIPE-04: checkout flow works with mocked payment intent', async ({
  page,
  productListPage,
}) => {
  await page.route('**/api/payments/create-intent', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        clientSecret: 'pi_test_secret_mock',
        paymentIntentId: 'pi_test_mock',
      }),
    });
  });

  // Also mock confirmCardPayment result via Stripe.js — not easily interceptable;
  // this test validates the UI flow up to the CardElement render
  await page.goto('/');
  await productListPage.clickFirstProduct();
  await page.getByTestId('add-to-cart-btn').click();
  await page.getByTestId('cart-icon').click();
  await page.getByTestId('checkout-btn').click();

  await page.getByTestId('street-input').fill('123 Test St');
  await page.getByTestId('city-input').fill('Manila');
  await page.getByTestId('state-input').fill('Metro Manila');
  await page.getByTestId('zip-input').fill('1000');
  await page.getByTestId('continue-to-payment-btn').click();

  // Stripe iframe should be rendered
  await expect(page.frameLocator('iframe[name*="__privateStripeFrame"]').first().locator('[placeholder="Card number"]')).toBeVisible({ timeout: 8_000 });
});
