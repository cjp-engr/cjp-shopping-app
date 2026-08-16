// TC-101: Buyer places COD order with a variant product on mobile

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp(
    'TC-101: buyer completes COD checkout with variant product',
    tags: ['checkout-variant-cod', 'smoke'],
    ($, modules) async {
      await modules.auth.login(
        email: TestCredentials.buyerEmail,
        password: TestCredentials.password,
      );

      await modules.products.addVariantProductToCart('E2E Test Variant Tee');
      await modules.products.navigateToCart();
      await modules.checkout.proceedToCheckout();
      await modules.checkout.fillShippingAddress();
      await modules.checkout.selectCOD();
      await modules.checkout.placeOrder();
      await modules.checkout.expectOrdersScreen();
    },
  );
}
