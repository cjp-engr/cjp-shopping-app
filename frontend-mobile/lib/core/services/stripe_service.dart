import 'package:flutter_stripe/flutter_stripe.dart';

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
    return paymentMethod.id as String;
  }

  /// Confirm a PaymentIntent using client secret.
  /// Handles 3D Secure authentication if required.
  ///
  /// Args:
  ///   clientSecret: From backend /api/payment-intents response
  ///
  /// Returns: { 'status': 'succeeded' | 'processing' | 'requires_action', 'error': null | String }
  /// If 3D Secure is required, opens modal for user authentication.
  static Future<Map<String, dynamic>> confirmPayment(String clientSecret) async {
    try {
      final result = await Stripe.instance.confirmPayment(
        clientSecret,
      );
      return {
        'status': result.status.toString(),
        'error': null,
      };
    } on StripeException catch (e) {
      final errorCode = e.error.code?.toString() ?? 'unknown_error';
      return {
        'status': 'failed',
        'error': errorCode,
      };
    } catch (e) {
      return {
        'status': 'failed',
        'error': 'network_error',
      };
    }
  }

  /// Retrieve PaymentIntent status (optional, for verification).
  static Future<String?> getPaymentIntentStatus(String clientSecret) async {
    try {
      final paymentIntent = await Stripe.instance.retrievePaymentIntent(clientSecret);
      return paymentIntent.status.toString();
    } catch (e) {
      return null;
    }
  }
}
