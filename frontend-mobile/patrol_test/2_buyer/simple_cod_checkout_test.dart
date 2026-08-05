// TC-095: Buyer places COD order via full checkout flow on mobile

import 'package:flutter_test/flutter_test.dart' show find;
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-095: buyer completes COD checkout flow', tags: ['smoke'],
      ($, modules) async {
    await modules.auth.login(
      email: TestCredentials.buyerEmail,
      password: TestCredentials.password,
    );

    // Add a known seeded product to cart
    await $(keys.products.productCard('E2E Test Lamp - Test'))
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

    // Select Cash on Delivery
    await $(keys.orders.paymentOption('cash-on-delivery')).scrollTo().tap();

    // Place the order
    await $(keys.orders.placeOrderButton).scrollTo().tap();

    // Assert: navigated to orders screen
    await $(keys.orders.ordersScreen).waitUntilVisible();
  });
}
