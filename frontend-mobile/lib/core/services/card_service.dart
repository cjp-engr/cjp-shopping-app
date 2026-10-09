import 'package:dio/dio.dart';
import '../network/api_client.dart';

const String _logTag = '[CardService]';
const String _endpoint = '/payments/save-card';

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
  /// Throws:
  ///   CardSavingException: If the save operation fails
  Future<void> saveCard(String stripePaymentMethodId) async {
    if (stripePaymentMethodId.isEmpty) {
      throw CardSavingException('Payment method ID cannot be empty');
    }

    try {
      print('$_logTag Saving card: $stripePaymentMethodId');

      final response = await _apiClient.dio.post(
        _endpoint,
        data: {'stripePaymentMethodId': stripePaymentMethodId},
      );

      _validateResponse(response);
      print('$_logTag Card saved successfully');
    } on CardSavingException {
      rethrow;
    } on DioException catch (e) {
      final message = mapDioError(e);
      print('$_logTag DIO error: $message');
      throw CardSavingException(message);
    } catch (e) {
      final errorMsg = 'Failed to save card: $e';
      print('$_logTag Unexpected error: $errorMsg');
      throw CardSavingException(errorMsg);
    }
  }

  void _validateResponse(Response response) {
    if (response.statusCode == null || response.statusCode! > 299) {
      throw CardSavingException(
        'Failed to save card (status: ${response.statusCode})',
      );
    }

    final data = response.data;
    if (data is! Map<String, dynamic>) {
      throw CardSavingException('Invalid response format');
    }

    if (data['success'] != true) {
      final message = data['message'] as String? ?? 'Unknown error';
      throw CardSavingException(message);
    }
  }
}
