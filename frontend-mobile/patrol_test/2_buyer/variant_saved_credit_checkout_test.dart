// TC-104: Buyer places saved credit card order with a variant product on mobile

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp(
    'TC-104: buyer completes saved credit checkout with variant product',
    tags: ['checkout-variant-saved-cc', 'checkout', 'smoke'],
    ($, modules) async {
      await modules.auth.login(
        email: TestCredentials.buyerEmail,
        password: TestCredentials.password,
      );

      await modules.products.addVariantProductToCart('E2E Test Variant Tee');
      await modules.products.navigateToCart();
      await modules.checkout.proceedToCheckout();
      await modules.checkout.fillShippingAddress();
      await modules.checkout.selectCreditCard();
      await modules.checkout.placeOrder();
      await modules.checkout.expectOrdersScreen();
    },
  );
}
