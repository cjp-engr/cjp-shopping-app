// TC-097: Checkout with new card entry (mobile)

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-097: buyer completes checkout with new credit card',
      tags: ['checkout-new-cc', 'checkout', 'smoke'], ($, modules) async {
    await modules.auth.login(
      email: TestCredentials.buyerEmail,
      password: TestCredentials.password,
    );

    await modules.products.addSimpleProductToCart('The Art of Programming');
    await modules.products.navigateToCart();
    await modules.checkout.proceedToCheckout();
    await modules.checkout.fillShippingAddress();
    await modules.checkout.selectCreditCard();
    await modules.checkout.switchToNewCardIfNeeded();
    await modules.checkout.fillNewCard(
      cardNumber: '4111111111111111',
      cardHolder: 'Test Buyer',
    );
    await modules.checkout.placeOrder();
    await modules.checkout.expectOrdersScreen();
  });
}
