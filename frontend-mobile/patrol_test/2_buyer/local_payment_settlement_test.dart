import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';
import '../modules/local_payment_api.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  if (!localPaymentVerificationEnabled) return;
  const acceptedId = String.fromEnvironment('LOCAL_ACCEPT_ORDER_ID');
  const cancelledId = String.fromEnvironment('LOCAL_CANCEL_ORDER_ID');
  const expiredId = String.fromEnvironment('LOCAL_EXPIRED_ORDER_ID');

  testApp('Local manual capture: seller accepts Android checkout',
      ($, modules) async {
    LocalPaymentApi.requireLocalApi();
    if (acceptedId.isEmpty) {
      throw StateError('Explicit isolated local order required');
    }
    await modules.auth.login(
        email: TestCredentials.sellerEmail, password: TestCredentials.password);
    await modules.seller.navigateToDashboard();
    await $(keys.seller.ordersTab).tap();
    await $(keys.seller.acceptOrderButton(acceptedId)).scrollTo().tap();
    final api = LocalPaymentApi();
    try {
      await api.loginBuyer();
      await api.waitForCapture(acceptedId);
    } finally {
      api.close();
    }
  });

  testApp('Local manual capture: buyer cancels and sees settlement states',
      ($, modules) async {
    LocalPaymentApi.requireLocalApi();
    if (acceptedId.isEmpty || cancelledId.isEmpty || expiredId.isEmpty) {
      throw StateError('Explicit isolated local orders required');
    }
    await modules.auth.login(
        email: TestCredentials.buyerEmail, password: TestCredentials.password);
    await $(keys.orders.ordersNavTab).tap();
    await $(keys.orders.orderCard(cancelledId)).scrollTo().tap();
    await $(keys.orders.cancelOrderButton).scrollTo().tap();
    await $(keys.widgets.dialogConfirmButton).tap();
    await (await $(keys.orders.paymentNoticeTitle('Reservation released'))
            .scrollTo())
        .waitUntilVisible();
    await $.platform.android.pressBack();
    await $(keys.orders.orderCard(acceptedId)).scrollTo().tap();
    await (await $(keys.orders.paymentNoticeTitle('Payment charged'))
            .scrollTo())
        .waitUntilVisible();
    await $.platform.android.pressBack();
    await $(keys.orders.orderCard(expiredId)).scrollTo().tap();
    await (await $(keys.orders.paymentNoticeTitle('Reservation released'))
            .scrollTo())
        .waitUntilVisible();
  });
}
