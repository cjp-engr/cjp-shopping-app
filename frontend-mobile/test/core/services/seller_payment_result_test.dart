import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/services/seller_payment_result.dart';

void main() {
  group('classifyConfirmedIntent', () {
    test('requires_capture means the funds are held', () {
      expect(
        classifyConfirmedIntent(PaymentIntentsStatus.RequiresCapture).outcome,
        SellerPaymentOutcome.requiresCapture,
      );
    });

    test('succeeded means the legacy flow charged the funds', () {
      expect(
        classifyConfirmedIntent(PaymentIntentsStatus.Succeeded).outcome,
        SellerPaymentOutcome.succeeded,
      );
    });

    test('canceled intent is a failure', () {
      final result = classifyConfirmedIntent(PaymentIntentsStatus.Canceled);
      expect(result.outcome, SellerPaymentOutcome.failed);
      expect(result.errorCode, 'canceled');
    });

    for (final status in [
      PaymentIntentsStatus.RequiresPaymentMethod,
      PaymentIntentsStatus.RequiresConfirmation,
      PaymentIntentsStatus.RequiresAction,
      PaymentIntentsStatus.Processing,
      PaymentIntentsStatus.Unknown,
    ]) {
      test('${status.name} is unknown until the server confirms the intent', () {
        expect(classifyConfirmedIntent(status).outcome, SellerPaymentOutcome.unknown);
      });
    }
  });

  group('classifyStripeFailure', () {
    test('a cancelled verification is canceledByUser with the cancel code', () {
      final result = classifyStripeFailure(code: FailureCode.Canceled, message: 'cancelled');
      expect(result.outcome, SellerPaymentOutcome.canceledByUser);
      expect(result.errorCode, 'payment_cancelled');
      expect(result.message, 'cancelled');
    });

    for (final code in [FailureCode.Failed, FailureCode.Timeout, FailureCode.Unknown]) {
      test('${code.name} is a failure that keeps the SDK code', () {
        final result = classifyStripeFailure(code: code, message: 'Your card was declined.');
        expect(result.outcome, SellerPaymentOutcome.failed);
        expect(result.errorCode, code.name);
        expect(result.message, 'Your card was declined.');
      });
    }
  });

  test('a non-Stripe error is unknown, so the buyer is not told the payment failed', () {
    final result = unexpectedPaymentFailure(StateError('connection dropped'));
    expect(result.outcome, SellerPaymentOutcome.unknown);
    expect(result.errorCode, 'network_error');
  });
}
