import 'package:flutter_stripe/flutter_stripe.dart';

/// What the checkout does next with one seller's payment after the Stripe SDK call.
enum SellerPaymentOutcome {
  /// Manual capture: the funds are held (PaymentIntent `requires_capture`).
  requiresCapture,

  /// Legacy flow only: the funds were charged (PaymentIntent `succeeded`).
  succeeded,

  /// The buyer cancelled card verification. The checkout can be retried.
  canceledByUser,

  /// Stripe refused or failed the payment. [SellerPaymentResult.errorCode] says why.
  failed,

  /// The outcome is not known from the SDK result. Read the intent from the server before offering a retry.
  unknown,
}

/// Outcome of one confirmation. Carries only Stripe's codes and messages, never the client secret.
class SellerPaymentResult {
  const SellerPaymentResult({required this.outcome, this.errorCode, this.message});

  final SellerPaymentOutcome outcome;

  /// Machine-readable code, for example `payment_cancelled`, `card_declined` or `network_error`.
  final String? errorCode;

  /// Stripe's message, when it gave one.
  final String? message;

  @override
  String toString() => 'SellerPaymentResult(outcome: ${outcome.name}, errorCode: $errorCode)';
}

/// Maps the intent status returned after `confirmPayment` onto an outcome.
SellerPaymentResult classifyConfirmedIntent(PaymentIntentsStatus status) {
  switch (status) {
    case PaymentIntentsStatus.RequiresCapture:
      return const SellerPaymentResult(outcome: SellerPaymentOutcome.requiresCapture);
    case PaymentIntentsStatus.Succeeded:
      return const SellerPaymentResult(outcome: SellerPaymentOutcome.succeeded);
    case PaymentIntentsStatus.Canceled:
      return const SellerPaymentResult(outcome: SellerPaymentOutcome.failed, errorCode: 'canceled');
    case PaymentIntentsStatus.RequiresPaymentMethod:
    case PaymentIntentsStatus.RequiresConfirmation:
    case PaymentIntentsStatus.RequiresAction:
    case PaymentIntentsStatus.Processing:
    case PaymentIntentsStatus.Unknown:
      // The SDK gave no decisive answer; the checkout must read the intent before retrying.
      return const SellerPaymentResult(outcome: SellerPaymentOutcome.unknown);
  }
}

/// Maps an error thrown by the SDK.
SellerPaymentResult classifyStripeFailure({required FailureCode code, String? message}) {
  if (code == FailureCode.Canceled) {
    return SellerPaymentResult(
      outcome: SellerPaymentOutcome.canceledByUser,
      errorCode: 'payment_cancelled',
      message: message,
    );
  }
  return SellerPaymentResult(outcome: SellerPaymentOutcome.failed, errorCode: code.name, message: message);
}

/// A failure that is not a Stripe error, such as a dropped connection. The payment may or may not have gone through.
SellerPaymentResult unexpectedPaymentFailure(Object error) {
  return SellerPaymentResult(
    outcome: SellerPaymentOutcome.unknown,
    errorCode: 'network_error',
    message: error.runtimeType.toString(),
  );
}
