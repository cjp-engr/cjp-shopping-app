import 'package:flutter_stripe/flutter_stripe.dart';

import 'seller_payment_result.dart';

class StripeService {
  /// Create a Stripe PaymentMethod from card details collected by CardFormField.
  /// Called on client side before sending to backend.
  ///
  /// Returns the Stripe PaymentMethod ID (pm_...).
  /// Throws StripeException if card is invalid or network error.
  static Future<String> createPaymentMethod() async {
    final paymentMethod = await Stripe.instance.createPaymentMethod(
      params: const PaymentMethodParams.card(
        paymentMethodData: PaymentMethodData(),
      ),
    );
    return paymentMethod.id;
  }

  /// Confirm a PaymentIntent using its client secret, handling 3D Secure when required.
  ///
  /// [paymentMethodId] names the card to use. The session checkout creates intents without a card,
  /// so it must pass one. The legacy flow leaves it null: the backend attached the card when it
  /// created the intent.
  ///
  /// The client secret is never logged or returned. The result carries only the outcome and
  /// Stripe's codes and messages (see [SellerPaymentResult]).
  static Future<SellerPaymentResult> confirmPayment(
    String clientSecret, {
    String? paymentMethodId,
  }) async {
    try {
      final intent = await Stripe.instance.confirmPayment(
        paymentIntentClientSecret: clientSecret,
        data: paymentMethodId == null
            ? null
            : PaymentMethodParams.cardFromMethodId(
                paymentMethodData: PaymentMethodDataCardFromMethod(
                  paymentMethodId: paymentMethodId,
                ),
              ),
      );
      return classifyConfirmedIntent(intent.status);
    } on StripeException catch (e) {
      return classifyStripeFailure(code: e.error.code, message: e.error.message);
    } catch (e) {
      return unexpectedPaymentFailure(e);
    }
  }

  /// Reads the intent's current state without confirming it. Used before confirming, and to settle an
  /// unknown outcome. Never changes the payment.
  static Future<SellerPaymentResult> readSellerPayment(String clientSecret) async {
    try {
      final intent = await Stripe.instance.retrievePaymentIntent(clientSecret);
      return classifyConfirmedIntent(intent.status);
    } catch (e) {
      return unexpectedPaymentFailure(e);
    }
  }

  /// Retrieve PaymentIntent status (optional, for verification).
  static Future<String?> getPaymentIntentStatus(String clientSecret) async {
    try {
      final paymentIntent =
          await Stripe.instance.retrievePaymentIntent(clientSecret);
      return paymentIntent.status.toString();
    } catch (e) {
      return null;
    }
  }
}
