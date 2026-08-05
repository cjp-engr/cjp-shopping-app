// TC-103: Buyer places credit order with a variant product on mobile

import 'package:flutter_test/flutter_test.dart' show find;
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import 'test_app.dart';
import 'test_credentials.dart';

void main() {
  testApp(
    'TC-103: buyer completes new credit checkout with variant product',
    tags: ['checkout-variant-new-cc', 'smoke'],
    ($, modules) async {
      await modules.auth.login(
        email: TestCredentials.buyerEmail,
        password: TestCredentials.password,
      );

      // Scroll to the variant product and open its detail page
      await $(keys.products.productCard('E2E Variant Shirt - Test'))
          .scrollTo(view: find.byKey(keys.products.productList))
          .tap();

      // Select a variant (Size M)
      await $(keys.products.variantValue('Size', 'M')).scrollTo().tap();

      // Add to cart
      await $(keys.products.addToCartButton).tap();

      // Navigate to cart
      await $(keys.products.productDetailCartIconButton).tap();

      // Proceed to checkout (all items auto-selected)
      await $(keys.cart.checkoutButton).tap();

      // Fill shipping address
      await $(keys.orders.checkoutStreetField).enterText('123 Test Street');
      await $(keys.orders.checkoutCityField).enterText('Manila');
      await $(keys.orders.checkoutStateField).enterText('Metro Manila');
      await $(keys.orders.checkoutZipField).enterText('1000');

      // Select Credit Card payment type
      await $(keys.orders.paymentOption('credit-card')).scrollTo().tap();

      // Switch to new card mode — toggle only appears when buyer has saved cards
      if ($(keys.orders.paymentNewCardTab).exists) {
        await $(keys.orders.paymentNewCardTab).scrollTo().tap();
      }

      // Fill new card details
      await $(keys.orders.checkoutCardNumberField)
          .scrollTo()
          .enterText('4111111111111111');
      await $(keys.orders.checkoutCardHolderField)
          .scrollTo()
          .enterText('Test Buyer');

      // Place order
      await $(keys.orders.placeOrderButton).scrollTo().tap();

      // Assert: orders screen is visible
      await $(keys.orders.ordersScreen).waitUntilVisible();
    },
  );
}
