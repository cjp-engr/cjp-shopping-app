import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:toko_mart/features/seller/domain/seller_acceptance.dart';

import 'seller_test_data.dart';

void main() {
  final now = DateTime.utc(2026, 10, 17, 12);

  group('acceptanceErrorMessage', () {
    test('maps every backend code to the web copy', () {
      expect(acceptanceErrorMessage('acceptance_deadline_passed'),
          'The acceptance window for this order has ended.');
      expect(acceptanceErrorMessage('order_not_pending'),
          'This order is no longer waiting for acceptance. Refresh to see its latest status.');
      expect(acceptanceErrorMessage('capture_failed'),
          'The payment could not be charged. Try accepting again.');
      expect(acceptanceErrorMessage('authorization_expired'),
          "The buyer's payment reservation expired, so this order was cancelled.");
      expect(acceptanceErrorMessage('payment_reference_missing'),
          'This order has no payment on file. Contact support.');
      expect(acceptanceErrorMessage('not_order_seller'),
          'This order is not available to you.');
      expect(acceptanceErrorMessage('order_not_found'),
          'This order is not available to you.');
    });

    test('falls back to a generic message for unknown or missing codes', () {
      const generic = 'Could not accept the order. Please try again.';
      expect(acceptanceErrorMessage('something_else'), generic);
      expect(acceptanceErrorMessage(null), generic);
    });
  });

  group('acceptanceDeadlineText', () {
    String? text({DateTime? acceptBy, String status = 'pending'}) =>
        acceptanceDeadlineText(
            sellerOrder(status: status, acceptBy: acceptBy), now);

    test('is null without a deadline or once the order is not pending', () {
      expect(text(acceptBy: null), isNull);
      expect(
          text(status: 'preparing', acceptBy: now.add(const Duration(hours: 2))),
          isNull);
    });

    test('shows hours and minutes within 24 hours', () {
      expect(text(acceptBy: now.add(const Duration(hours: 3, minutes: 20))),
          'Accept within 3h 20m');
    });

    test('shows minutes only under an hour and hours only on the hour', () {
      expect(text(acceptBy: now.add(const Duration(minutes: 45))),
          'Accept within 45m');
      expect(text(acceptBy: now.add(const Duration(hours: 2))),
          'Accept within 2h');
    });

    test('rounds a partial minute up', () {
      expect(text(acceptBy: now.add(const Duration(minutes: 44, seconds: 1))),
          'Accept within 45m');
    });

    test('shows exactly 24 hours as a countdown', () {
      expect(text(acceptBy: now.add(const Duration(hours: 24))),
          'Accept within 24h');
    });

    test('shows the date and time when more than 24 hours remain', () {
      final deadline = now.add(const Duration(hours: 30));
      expect(text(acceptBy: deadline),
          'Accept by ${DateFormat('MMM d, y, h:mm a').format(deadline.toLocal())}');
    });

    test('reports the ended window at and after the deadline', () {
      expect(text(acceptBy: now), 'Acceptance window ended');
      expect(text(acceptBy: now.subtract(const Duration(minutes: 1))),
          'Acceptance window ended');
    });
  });

  group('canAcceptOrder', () {
    test('legacy order without a deadline stays acceptable', () {
      expect(canAcceptOrder(sellerOrder(), now), isTrue);
    });

    test('is acceptable before the deadline and rejected at it', () {
      expect(
          canAcceptOrder(
              sellerOrder(acceptBy: now.add(const Duration(seconds: 1))), now),
          isTrue);
      expect(canAcceptOrder(sellerOrder(acceptBy: now), now), isFalse);
      expect(
          canAcceptOrder(
              sellerOrder(acceptBy: now.subtract(const Duration(hours: 1))),
              now),
          isFalse);
    });

    test('is rejected while the capture is pending or the order is not pending',
        () {
      expect(canAcceptOrder(sellerOrder(paymentStatus: 'capture_pending'), now),
          isFalse);
      expect(canAcceptOrder(sellerOrder(status: 'preparing'), now), isFalse);
    });
  });

  group('capture pending helpers', () {
    test('detect a pending capture in a list', () {
      expect(isCapturePending(sellerOrder(paymentStatus: 'capture_pending')),
          isTrue);
      expect(isCapturePending(sellerOrder(paymentStatus: 'captured')), isFalse);
      expect(hasCapturePending([sellerOrder(), sellerOrder()]), isFalse);
      expect(
          hasCapturePending([
            sellerOrder(),
            sellerOrder(id: 'b', paymentStatus: 'capture_pending')
          ]),
          isTrue);
    });
  });
}
