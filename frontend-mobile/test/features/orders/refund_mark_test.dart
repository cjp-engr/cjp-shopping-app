import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/features/orders/data/models/order_model.dart';
import 'package:toko_mart/features/orders/domain/refund_mark.dart';

const _marks = [
  RefundedItemMark(lineId: 'a', refunded: 1, processing: 1),
  RefundedItemMark(lineId: 'b', refunded: 2, processing: 0),
  RefundedItemMark(lineId: 'c', refunded: 0, processing: 1),
];

void main() {
  group('refundMarkFor', () {
    test('says Refunded when every unit of the item was paid back', () {
      final mark = refundMarkFor(_marks, 'b', 2)!;
      expect((mark.label, mark.done), ('Refunded', true));
    });

    test('says how many units were refunded when only some were', () {
      final mark = refundMarkFor(
          const [RefundedItemMark(lineId: 'a', refunded: 1, processing: 0)],
          'a',
          3)!;
      expect((mark.label, mark.done), ('1 of 3 refunded', true));
    });

    test(
        'says Refund processing while approved units are still being paid back',
        () {
      expect(refundMarkFor(_marks, 'c', 1)!.label, 'Refund processing');
      expect(refundMarkFor(_marks, 'c', 1)!.done, isFalse);
      expect(refundMarkFor(_marks, 'a', 2)!.label, '1 refunded, 1 processing');
    });

    test(
        'marks nothing without refunds, for an unknown item or without a line id',
        () {
      expect(refundMarkFor(_marks, 'z', 1), isNull);
      expect(refundMarkFor(const [], 'a', 1), isNull);
      expect(refundMarkFor(_marks, null, 1), isNull);
      expect(
          refundMarkFor(
              const [RefundedItemMark(lineId: 'a', refunded: 0, processing: 0)],
              'a',
              1),
          isNull);
    });
  });

  group('order parsing', () {
    Map<String, dynamic> json({Object? marks}) => {
          '_id': 'o1',
          'status': 'delivered',
          'subtotal': 10,
          'total': 12,
          'createdAt': '2026-10-17T00:00:00.000Z',
          'items': [
            {
              '_id': 'line-1',
              'product': {'_id': 'p1', 'name': 'Mug', 'price': 5},
              'quantity': 2
            },
            {
              '_id': 'line-2',
              'product': 'p2',
              'productName': 'Cup',
              'quantity': 1
            },
          ],
          if (marks != null) 'refundedItems': marks,
        };

    test('keeps each item line id and the refunded item marks', () {
      final order = OrderModel.fromJson(json(marks: [
        {'lineId': 'line-1', 'refunded': 1, 'processing': 0}
      ]));

      expect(order.items.map((i) => i.lineId), ['line-1', 'line-2']);
      expect(order.refundedItems.single.lineId, 'line-1');
      expect(order.refundedItems.single.refunded, 1);
    });

    test('an order from an older server has no marks', () {
      final order = OrderModel.fromJson(json());
      expect(order.refundedItems, isEmpty);
    });
  });

  group('orderRefundLabel', () {
    test('says Fully refunded once everything paid was paid back', () {
      final mark = orderRefundLabel(
          paymentStatus: 'refunded', refundedAmountMinor: 3200)!;
      expect((mark.label, mark.done), ('Fully refunded', true));
    });

    test('says Partially refunded when some money was paid back but not all',
        () {
      final mark = orderRefundLabel(
          paymentStatus: 'partially_refunded', refundedAmountMinor: 1080)!;
      expect((mark.label, mark.done), ('Partially refunded', true));
    });

    test(
        'says Refund processing while an approved refund is still being paid back',
        () {
      final mark = orderRefundLabel(
          paymentStatus: 'captured', refundReservedAmountMinor: 1080)!;
      expect((mark.label, mark.done), ('Refund processing', false));
    });

    test('shows nothing for an order with no refund', () {
      expect(orderRefundLabel(paymentStatus: 'captured'), isNull);
      expect(orderRefundLabel(), isNull);
    });
  });
}
