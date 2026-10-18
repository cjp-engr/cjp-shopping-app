// TC-AUTH-01: actual Stripe native new-card authorization on local Android.
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';
import '../modules/local_payment_api.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  if (!localPaymentVerificationEnabled) return;
  testApp('Local manual capture: new card',
      initializeStripe: true,
      tags: ['local-stripe-verification'], ($, modules) async {
    final api = LocalPaymentApi();
    try {
      await api.loginBuyer();
      await api.prepareCart({localPaymentProductName});
      final before = await api.orderIds();
      await modules.auth.login(
          email: TestCredentials.buyerEmail,
          password: TestCredentials.password);
      await $(keys.products.cartIconButton).tap();
      await modules.checkout.proceedToCheckout();
      await modules.checkout.fillShippingAddress();
      await modules.checkout.selectCreditCard();
      await modules.checkout.placeOrder();
      await $.platform.android.enterText(
          const AndroidSelector(
              resourceName: 'com.example.TokoMart:id/et_card_number'),
          text: '4242424242424242',
          keyboardBehavior: KeyboardBehavior.alternative);
      await $.platform.android.enterText(
          const AndroidSelector(
              resourceName: 'com.example.TokoMart:id/et_expiry'),
          text: '1230',
          keyboardBehavior: KeyboardBehavior.alternative);
      await $.platform.android.enterText(
          const AndroidSelector(resourceName: 'com.example.TokoMart:id/et_cvc'),
          text: '123',
          keyboardBehavior: KeyboardBehavior.alternative);
      await $.platform.android.enterText(
          const AndroidSelector(
              resourceName: 'com.example.TokoMart:id/postal_code'),
          text: '10001',
          keyboardBehavior: KeyboardBehavior.alternative);
      await $(keys.orders.paymentSubmitButton).scrollTo().tap();
      await $(keys.orders.ordersScreen)
          .waitUntilVisible(timeout: const Duration(seconds: 90));
      await api.verifyAuthorizedOrders(
          previousOrderIds: before, sellerCount: 1);
    } finally {
      api.close();
    }
  });
}
