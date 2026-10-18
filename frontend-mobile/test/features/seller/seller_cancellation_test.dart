import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/features/seller/data/models/seller_order_model.dart';
import 'package:toko_mart/features/seller/domain/seller_cancellation.dart';

import 'seller_test_data.dart';

void main() {
  group('cancelReasonError', () {
    test('accepts 1 to 1000 characters after trimming', () {
      expect(cancelReasonError('Out of stock'), isNull);
      expect(cancelReasonError('  x  '), isNull);
      expect(cancelReasonError('y' * maxCancelReasonLength), isNull);
    });

    test('rejects an empty, blank or over-long reason', () {
      expect(cancelReasonError(''), contains('reason'));
      expect(cancelReasonError('   \n '), contains('reason'));
      expect(cancelReasonError('y' * (maxCancelReasonLength + 1)),
          contains('1000'));
    });
  });

  group('cancellationErrorMessage', () {
    test('maps each backend code to plain language', () {
      expect(cancellationErrorMessage('invalid_cancel_reason'),
          'Enter a reason of 1 to 1000 characters.');
      expect(cancellationErrorMessage('cancellation_conflict'),
          contains('Refresh'));
      expect(cancellationErrorMessage('cancellation_unavailable'),
          contains('cannot be cancelled'));
      expect(cancellationErrorMessage('not_order_seller'),
          'This order is not available to you.');
      expect(cancellationErrorMessage('order_not_found'),
          'This order is not available to you.');
    });

    test('falls back for unknown or missing codes', () {
      expect(cancellationErrorMessage(null),
          'Could not cancel the order. Please try again.');
      expect(cancellationErrorMessage('something_new'),
          'Could not cancel the order. Please try again.');
    });
  });

  group('isStaleCancellation', () {
    test('is true when the order moved on', () {
      for (final code in [
        'cancellation_conflict',
        'cancellation_unavailable',
        'not_order_seller',
        'order_not_found',
      ]) {
        expect(isStaleCancellation(code), isTrue, reason: code);
      }
    });

    test('is false for a fixable reason or an unknown failure', () {
      expect(isStaleCancellation('invalid_cancel_reason'), isFalse);
      expect(isStaleCancellation(null), isFalse);
    });
  });

  group('cancellationOutcomeMessage', () {
    test('never says money was returned until the release is complete', () {
      final pending = cancellationOutcomeMessage(SellerPaymentOperation.pending);
      expect(pending, contains('being released'));
      expect(pending, isNot(contains('was released')));
      expect(cancellationOutcomeMessage(SellerPaymentOperation.completed),
          contains('was released'));
      expect(cancellationOutcomeMessage(SellerPaymentOperation.needsReview),
          contains('support'));
    });

    test('is a plain confirmation when there was no card hold', () {
      expect(cancellationOutcomeMessage(null), 'Order cancelled.');
    });
  });

  group('parsePaymentOperation', () {
    test('reads the status of a payment operation object', () {
      expect(parsePaymentOperation({'status': 'pending'}),
          SellerPaymentOperation.pending);
      expect(parsePaymentOperation({'status': 'completed'}),
          SellerPaymentOperation.completed);
      expect(parsePaymentOperation({'status': 'needs_review'}),
          SellerPaymentOperation.needsReview);
    });

    test('ignores anything else, including the capture operation shape', () {
      expect(parsePaymentOperation(null), isNull);
      expect(parsePaymentOperation('pending'), isNull);
      expect(parsePaymentOperation({'status': 'resolving'}), isNull);
      expect(parsePaymentOperation({}), isNull);
    });
  });

  group('SellerOrderData cancellation fields', () {
    Map<String, dynamic> json(Map<String, dynamic> extra) => {
          '_id': 'o1',
          'status': 'pending',
          'items': <dynamic>[],
          'paymentMethod': {'type': 'credit-card'},
          ...extra,
        };

    test('fromJson parses the capability and the audit fields', () {
      final order = SellerOrderData.fromJson(json({
        'status': 'cancelled',
        'cancelReason': 'Out of stock',
        'cancelledByRole': 'seller',
        'cancelledAt': '2026-10-18T01:00:00.000Z',
        'canSellerCancelPending': false,
      }));
      expect(order.cancelReason, 'Out of stock');
      expect(order.cancelledByRole, 'seller');
      expect(order.cancelledAt, DateTime.utc(2026, 10, 18, 1));
      expect(order.canSellerCancelPending, isFalse);
    });

    test('older responses without them default to not cancellable', () {
      final order = SellerOrderData.fromJson(json({}));
      expect(order.canSellerCancelPending, isFalse);
      expect(order.cancelledByRole, isNull);
      expect(order.cancelledAt, isNull);
      expect(order.canCancel, isFalse);
    });

    test('a non-boolean capability or an invalid date never throws', () {
      final order = SellerOrderData.fromJson(json({
        'canSellerCancelPending': 'yes',
        'cancelledAt': 'not-a-date',
        'cancelledByRole': 42,
      }));
      expect(order.canSellerCancelPending, isFalse);
      expect(order.cancelledAt, isNull);
      expect(order.cancelledByRole, isNull);
    });

    test('a pending order is cancellable only when the server says so', () {
      expect(sellerOrder(canSellerCancelPending: true).canCancel, isTrue);
      expect(sellerOrder(canSellerCancelPending: false).canCancel, isFalse);
      expect(
          sellerOrder(
                  canSellerCancelPending: false,
                  paymentType: 'cash-on-delivery',
                  paymentStatus: 'not_required')
              .canCancel,
          isFalse);
    });

    test('after pending only cash on delivery stays cancellable', () {
      for (final status in ['preparing', 'processing']) {
        expect(
            sellerOrder(status: status, paymentType: 'cash-on-delivery')
                .canCancel,
            isTrue,
            reason: status);
        expect(
            sellerOrder(status: status, paymentType: 'credit-card').canCancel,
            isFalse,
            reason: status);
        expect(
            sellerOrder(
                    status: status,
                    paymentType: 'cash-on-delivery',
                    paymentFlowVersion: 'manual_capture')
                .canCancel,
            isFalse,
            reason: status);
      }
    });

    test('shipped, delivered and cancelled orders are not cancellable', () {
      for (final status in ['shipped', 'delivered', 'cancelled']) {
        expect(
            sellerOrder(
                    status: status,
                    paymentType: 'cash-on-delivery',
                    canSellerCancelPending: true)
                .canCancel,
            isFalse,
            reason: status);
      }
    });

    test('copyWith keeps the capability and the audit fields', () {
      final order = sellerOrder(
              canSellerCancelPending: true, cancelledByRole: 'seller')
          .copyWith(status: 'cancelled');
      expect(order.status, 'cancelled');
      expect(order.canSellerCancelPending, isTrue);
      expect(order.cancelledByRole, 'seller');
    });
  });
}
