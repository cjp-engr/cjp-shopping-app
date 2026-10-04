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
    return paymentMethod.id;
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
      print('Starting confirmPayment with clientSecret: $clientSecret');
      final result = await Stripe.instance.confirmPayment(
        paymentIntentClientSecret: clientSecret,
      );
      print('Stripe confirmPayment returned status: ${result.status}');
      print('Full result object: paymentIntentId=${result.id}, clientSecret=${result.clientSecret}');
      return {
        'status': result.status.toString(),
        'error': null,
      };
    } on StripeException catch (e) {
      final errorCode = (e.error.code ?? 'unknown_error').toString();
      // Log full error details for debugging
      print('StripeException caught:');
      print('  code: $errorCode');
      print('  message: ${e.error.message}');
      print('  declineCode: ${e.error.declineCode}');
      print('  rawException: ${e.error.exception}');
      return {
        'status': 'failed',
        'error': errorCode,
        'message': e.error.message,
        'declineCode': e.error.declineCode,
      };
    } catch (e) {
      print('Non-Stripe error in confirmPayment: $e');
      print('Error type: ${e.runtimeType}');
      return {
        'status': 'failed',
        'error': 'network_error',
        'message': e.toString(),
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
