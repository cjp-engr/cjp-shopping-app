// TC-096: Checkout with saved credit card (mobile)
// Tags: checkout, smoke
//
// Run (default — tags ignored):
//   patrol test --target patrol_test/saved_credit_checkout_test.dart --device emulator-5554
// Run (filtered):
//   patrol test --target patrol_test/saved_credit_checkout_test.dart --tags checkout

import 'package:flutter_test/flutter_test.dart' show find;
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import 'test_app.dart';
import 'test_credentials.dart';

void main() {
  testApp(
    'TC-096: buyer completes checkout with saved credit card',
    tags: ['checkout-saved-cc', 'checkout', 'smoke'],
    ($, modules) async {
      await modules.auth.login(
        email: TestCredentials.buyerEmail,
        password: TestCredentials.password,
      );

      // Add a known seeded product to cart
      await $(keys.products.productCard('E2E Test Lamp'))
          .scrollTo(view: find.byKey(keys.products.productList))
          .tap();
      await $(keys.products.addToCartButton).tap();

      // Navigate to cart from product detail
      await $(keys.products.productDetailCartIconButton).tap();

      // All items are auto-selected — proceed to checkout
      await $(keys.cart.checkoutButton).tap();

      // Fill shipping address (fresh user has no saved address)
      await $(keys.orders.checkoutStreetField).enterText('123 Test Street');
      await $(keys.orders.checkoutCityField).enterText('Manila');
      await $(keys.orders.checkoutStateField).enterText('Metro Manila');
      await $(keys.orders.checkoutZipField).enterText('1000');

      // Select Credit Card payment type (default, but explicit)
      // When buyer has saved cards the payment section auto-enters "Saved Card" mode —
      // no mode-toggle tap needed; the first/default saved card is pre-selected.
      await $(keys.orders.paymentOption('credit-card')).scrollTo().tap();

      // Place the order
      await $(keys.orders.placeOrderButton).scrollTo().tap();

      // Assert: navigated to orders screen
      await $(keys.orders.ordersScreen).waitUntilVisible();
    },
  );
}
