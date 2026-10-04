class StripeErrorMessages {
  static const Map<String, String> errorMap = {
    'card_declined': 'Your card was declined. Please try another card.',
    'expired_card': 'Your card has expired. Please use a different card.',
    'processing_error': 'Payment processing error. Please try again.',
    'rate_limit': 'Too many requests. Please wait and try again.',
    'authentication_error': 'Authentication failed. Please check your card details.',
    'card_error': 'Invalid card. Please check the card number and try again.',
    'invalid_expiry_month': 'Invalid expiration month. Please check and try again.',
    'invalid_expiry_year': 'Invalid expiration year. Please check and try again.',
    'invalid_cvc': 'Invalid CVC. Please check and try again.',
    'incorrect_cvc': 'Incorrect CVC. Please check and try again.',
    'lost_card': 'Your card has been reported as lost.',
    'stolen_card': 'Your card has been reported as stolen.',
    'network_error': 'Network error. Please check your connection and try again.',
    'unknown_error': 'An unexpected error occurred. Please try again.',
    'payment_cancelled': 'Payment was cancelled.',
  };

  /// Map Stripe error code to user-friendly message
  static String getErrorMessage(String? errorCode) {
    if (errorCode == null || errorCode.isEmpty) {
      return errorMap['unknown_error']!;
    }
    return errorMap[errorCode] ?? errorMap['unknown_error']!;
  }

  // Generic messages for different scenarios
  static const String paymentInitiationFailed =
      'Unable to process payment. Please try again.';
  static const String paymentConfirmationFailed =
      'Payment confirmation failed. Please try again.';
  static const String orderCreationFailed =
      'Order creation failed. Please contact support.';
  static const String savedCardsFetchFailed =
      'Failed to load saved cards. Please try again.';
  static const String cardSaveFailed =
      'Card saved locally, but couldn\'t be saved to your account. You can add it manually later.';
}
