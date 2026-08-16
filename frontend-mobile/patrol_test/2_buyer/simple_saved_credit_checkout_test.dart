// TC-096: Checkout with saved credit card (mobile)

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp(
    'TC-096: buyer completes checkout with saved credit card',
    tags: ['checkout-saved-cc', 'checkout', 'smoke'],
    ($, modules) async {
      await modules.auth.login(
        email: TestCredentials.buyerEmail,
        password: TestCredentials.password,
      );

      await modules.products.addSimpleProductToCart('The Art of Programming');
      await modules.products.navigateToCart();
      await modules.checkout.proceedToCheckout();
      await modules.checkout.fillShippingAddress();
      await modules.checkout.selectCreditCard();
      await modules.checkout.placeOrder();
      await modules.checkout.expectOrdersScreen();
    },
  );
}
