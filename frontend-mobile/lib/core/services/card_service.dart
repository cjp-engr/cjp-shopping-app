import 'package:dio/dio.dart';
import '../network/api_client.dart';

/// Exception thrown when card saving fails.
class CardSavingException implements Exception {
  final String message;

  CardSavingException(this.message);

  @override
  String toString() => 'CardSavingException: $message';
}

/// Service for saving payment methods to user's account.
class CardService {
  final ApiClient _apiClient;

  CardService(this._apiClient);

  /// Save a Stripe PaymentMethod to the user's account.
  ///
  /// The payment method must have already been created on the client side
  /// using Stripe's CardFormField or similar.
  ///
  /// Args:
  ///   stripePaymentMethodId: The Stripe PaymentMethod ID (pm_...)
  ///
  /// Throws:
  ///   CardSavingException: If the save operation fails
  Future<void> saveCard(String stripePaymentMethodId) async {
    try {
      final response = await _apiClient.dio.post(
        '/payments/save-card',
        data: {
          'stripePaymentMethodId': stripePaymentMethodId,
        },
      );

      // Check if response indicates success
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw CardSavingException(
          'Failed to save card (status: ${response.statusCode})',
        );
      }

      // Optional: validate response structure
      final data = response.data;
      if (data is! Map || data['success'] != true) {
        final message = data is Map ? data['message'] ?? 'Unknown error' : 'Unknown error';
        throw CardSavingException(message.toString());
      }
    } on CardSavingException {
      rethrow;
    } on DioException catch (e) {
      final message = mapDioError(e);
      throw CardSavingException(message);
    } catch (e) {
      throw CardSavingException('Failed to save card: ${e.toString()}');
    }
  }
}
