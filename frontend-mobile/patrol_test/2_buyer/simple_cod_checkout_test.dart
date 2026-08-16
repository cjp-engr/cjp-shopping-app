// TC-095: Buyer places COD order via full checkout flow on mobile

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-095: buyer completes COD checkout flow',
      tags: ['checkout-cod', 'checkout', 'smoke'], ($, modules) async {
    await modules.auth.login(
      email: TestCredentials.buyerEmail,
      password: TestCredentials.password,
    );

    await modules.products.addSimpleProductToCart('The Art of Programming');
    await modules.products.navigateToCart();
    await modules.checkout.proceedToCheckout();
    await modules.checkout.fillShippingAddress();
    await modules.checkout.selectCOD();
    await modules.checkout.placeOrder();
    await modules.checkout.expectOrdersScreen();
  });
}
