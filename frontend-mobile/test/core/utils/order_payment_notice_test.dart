import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/utils/order_payment_notice.dart';
import 'package:toko_mart/features/orders/data/models/order_model.dart';
import 'package:toko_mart/features/orders/domain/entities/order_entity.dart';
import 'package:toko_mart/features/orders/presentation/screens/order_payment_notice_card.dart';

OrderEntity _order({
  String flow = 'manual_capture',
  String? paymentStatus = 'authorized',
  String status = 'pending',
  String? paymentErrorCode,
  DateTime? placedAt,
  DateTime? acceptBy,
}) {
  return OrderEntity(
    id: 'order-1',
    userId: 'user-1',
    items: const [],
    shippingAddress: const OrderAddressEntity(
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    ),
    paymentType: 'card',
    subtotal: 100,
    productDiscount: 0,
    discount: 0,
    tax: 0,
    shipping: 0,
    total: 100,
    status: status,
    createdAt: '2026-10-17T00:00:00.000Z',
    paymentFlowVersion: flow,
    paymentStatus: paymentStatus,
    paymentErrorCode: paymentErrorCode,
    placedAt: placedAt,
    acceptBy: acceptBy,
  );
}

void main() {
  test('legacy refunds and payment reviews are visible', () {
    expect(orderPaymentNotice(_order(flow: 'legacy', paymentStatus: 'refund_pending'))?.title, 'Refund in progress');
    expect(orderPaymentNotice(_order(flow: 'legacy', paymentStatus: 'refunded'))?.title, 'Refunded');
    expect(orderPaymentNotice(_order(flow: 'legacy', paymentStatus: 'refund_pending', paymentErrorCode: 'refund_review'))?.title, 'Payment needs review');
  });
  test('buyer cancellation is available only before acceptance claims the order', () {
    expect(canBuyerCancel(_order()), isTrue);
    expect(canBuyerCancel(_order(paymentStatus: 'not_required')), isTrue);
    expect(canBuyerCancel(_order(paymentStatus: 'capture_pending')), isFalse);
    expect(canBuyerCancel(_order(status: 'preparing')), isFalse);
  });
  group('orderPaymentNotice', () {
    const expected = {
      'authorized': (
        OrderPaymentTone.info,
        'Payment reserved',
        'Your payment is reserved. It is charged when the seller starts preparing your order.',
      ),
      'capture_pending': (
        OrderPaymentTone.info,
        'Charging payment',
        'Your payment is being charged as the seller starts preparing your order.',
      ),
      'captured': (
        OrderPaymentTone.success,
        'Payment charged',
        'Your payment was charged when the seller started preparing your order.',
      ),
      'release_pending': (
        OrderPaymentTone.neutral,
        'Releasing reservation',
        'The payment reservation is being released. You will not be charged.',
      ),
      'released': (
        OrderPaymentTone.neutral,
        'Reservation released',
        'The payment reservation was released. You were not charged.',
      ),
      'refund_pending': (
        OrderPaymentTone.neutral,
        'Refund in progress',
        'Your refund has been requested and is being processed.',
      ),
      'refunded': (
        OrderPaymentTone.success,
        'Refunded',
        'Your payment was refunded.',
      ),
      'failed': (
        OrderPaymentTone.warning,
        'Payment problem',
        'We could not complete the payment for this order. Contact support if this continues.',
      ),
    };

    for (final entry in expected.entries) {
      test('${entry.key} maps to its tone, title and body', () {
        final notice = orderPaymentNotice(_order(paymentStatus: entry.key));

        expect(notice, isNotNull);
        expect(notice!.tone, entry.value.$1);
        expect(notice.title, entry.value.$2);
        expect(notice.body, entry.value.$3);
      });
    }

    test('returns null for a legacy order', () {
      expect(orderPaymentNotice(_order(flow: 'legacy')), isNull);
    });

    test('returns null for a legacy order even with a payment status', () {
      expect(
        orderPaymentNotice(_order(flow: 'legacy', paymentStatus: 'captured')),
        isNull,
      );
    });

    test('returns null for a null payment status', () {
      expect(orderPaymentNotice(_order(paymentStatus: null)), isNull);
    });

    test('returns null for an unknown payment status', () {
      expect(orderPaymentNotice(_order(paymentStatus: 'mystery')), isNull);
    });

    test('accepts an OrderModel (subtype of OrderEntity)', () {
      final model = OrderModel.fromJson(const {
        '_id': 'order-1',
        'status': 'pending',
        'subtotal': 100,
        'total': 110,
        'createdAt': '2026-10-17T00:00:00.000Z',
        'paymentFlowVersion': 'manual_capture',
        'paymentStatus': 'authorized',
      });

      expect(orderPaymentNotice(model)?.title, 'Payment reserved');
    });
  });

  group('orderAcceptanceDeadlineText', () {
    final now = DateTime(2026, 10, 17, 9, 0);

    test('formats the local deadline for a pending manual-capture order', () {
      final text = orderAcceptanceDeadlineText(
        _order(acceptBy: DateTime(2026, 10, 18, 14, 30)),
        now,
      );

      expect(text, 'The seller has until Oct 18, 2:30 PM to accept');
    });

    test('includes the year when the deadline is in another year', () {
      final text = orderAcceptanceDeadlineText(
        _order(acceptBy: DateTime(2027, 1, 2, 8, 5)),
        now,
      );

      expect(text, 'The seller has until Jan 2, 2027, 8:05 AM to accept');
    });

    test('converts a UTC deadline to local time', () {
      final acceptByUtc = DateTime.utc(2026, 10, 18, 14, 30);
      final local = acceptByUtc.toLocal();
      final text = orderAcceptanceDeadlineText(_order(acceptBy: acceptByUtc), now);

      expect(text, contains('The seller has until Oct ${local.day}'));
    });

    test('is null when acceptBy is missing', () {
      expect(orderAcceptanceDeadlineText(_order(), now), isNull);
    });

    test('is null once the order is no longer pending', () {
      final text = orderAcceptanceDeadlineText(
        _order(status: 'preparing', acceptBy: DateTime(2026, 10, 18, 14, 30)),
        now,
      );

      expect(text, isNull);
    });

    test('is null for legacy orders', () {
      final text = orderAcceptanceDeadlineText(
        _order(flow: 'legacy', acceptBy: DateTime(2026, 10, 18, 14, 30)),
        now,
      );

      expect(text, isNull);
    });
  });

  group('hasShortAcceptanceWindow', () {
    final placedAt = DateTime.utc(2026, 10, 17, 1);

    test('true when acceptBy is earlier than placedAt + 24h', () {
      expect(
        hasShortAcceptanceWindow(
          _order(placedAt: placedAt, acceptBy: DateTime.utc(2026, 10, 17, 20)),
        ),
        isTrue,
      );
    });

    test('false when acceptBy is exactly placedAt + 24h', () {
      expect(
        hasShortAcceptanceWindow(
          _order(placedAt: placedAt, acceptBy: DateTime.utc(2026, 10, 18, 1)),
        ),
        isFalse,
      );
    });

    test('false when acceptBy is later than placedAt + 24h', () {
      expect(
        hasShortAcceptanceWindow(
          _order(placedAt: placedAt, acceptBy: DateTime.utc(2026, 10, 18, 2)),
        ),
        isFalse,
      );
    });

    test('false when placedAt or acceptBy is missing', () {
      expect(hasShortAcceptanceWindow(_order(acceptBy: placedAt)), isFalse);
      expect(hasShortAcceptanceWindow(_order(placedAt: placedAt)), isFalse);
    });

    test('false for legacy orders', () {
      expect(
        hasShortAcceptanceWindow(
          _order(
            flow: 'legacy',
            placedAt: placedAt,
            acceptBy: DateTime.utc(2026, 10, 17, 20),
          ),
        ),
        isFalse,
      );
    });

    test('false once the order is no longer pending', () {
      expect(
        hasShortAcceptanceWindow(
          _order(
            status: 'preparing',
            placedAt: placedAt,
            acceptBy: DateTime.utc(2026, 10, 17, 20),
          ),
        ),
        isFalse,
      );
    });
  });

  group('OrderPaymentNoticeCard', () {
    testWidgets('shows the title and body for an authorized order',
        (tester) async {
      final notice = orderPaymentNotice(_order())!;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: OrderPaymentNoticeCard(notice: notice)),
        ),
      );

      expect(find.byKey(const Key('order-payment-notice')), findsOneWidget);
      expect(find.text('Payment reserved'), findsOneWidget);
      expect(
        find.text(
          'Your payment is reserved. It is charged when the seller starts preparing your order.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('renders every tone in a dark theme without errors',
        (tester) async {
      for (final tone in OrderPaymentTone.values) {
        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData.dark(),
            home: Scaffold(
              body: OrderPaymentNoticeCard(
                notice: OrderPaymentNotice(
                  tone: tone,
                  title: 'Title ${tone.name}',
                  body: 'Body',
                ),
              ),
            ),
          ),
        );

        expect(find.text('Title ${tone.name}'), findsOneWidget);
      }
    });
  });
}
