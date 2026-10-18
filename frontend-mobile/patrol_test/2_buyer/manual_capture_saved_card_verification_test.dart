// TC coverage: TC-AUTH-02, TC-AUTH-03 — actual saved-card authorization on local Android.
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';
import '../modules/local_payment_api.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  if (!localPaymentVerificationEnabled) return;
  testApp('Local manual capture: saved card and multiple sellers',
      initializeStripe: true,
      tags: ['local-stripe-verification'], ($, modules) async {
    final api = LocalPaymentApi();
    try {
      await api.loginBuyer();
      await api.prepareCart(
          {localPaymentProductName, localPaymentSecondProductName});
      final cardId = await api.savedCardId();
      final before = await api.orderIds();
      await modules.auth.login(
          email: TestCredentials.buyerEmail,
          password: TestCredentials.password);
      await $(keys.products.cartIconButton).tap();
      await modules.checkout.proceedToCheckout();
      await modules.checkout.fillShippingAddress();
      await modules.checkout.selectCreditCard();
      await modules.checkout.placeOrder();
      await $(keys.orders.paymentSavedCardsTab).scrollTo().tap();
      await $(keys.orders.savedPaymentCard(cardId)).scrollTo().tap();
      await $(keys.orders.paymentSubmitButton).scrollTo().tap();
      await $(keys.orders.ordersScreen)
          .waitUntilVisible(timeout: const Duration(seconds: 90));
      await api.verifyAuthorizedOrders(
          previousOrderIds: before, sellerCount: 2);
    } finally {
      api.close();
    }
  });
}
