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
      expect((mark.label, mark.kind), ('Refunded', RefundKind.full));
    });

    test('says how many units were refunded when only some were', () {
      final mark = refundMarkFor(
          const [RefundedItemMark(lineId: 'a', refunded: 1, processing: 0)],
          'a',
          3)!;
      expect((mark.label, mark.kind), ('1 of 3 refunded', RefundKind.partial));
    });

    test(
        'says Refund processing while approved units are still being paid back',
        () {
      expect(refundMarkFor(_marks, 'c', 1)!.label, 'Refund processing');
      expect(refundMarkFor(_marks, 'c', 1)!.kind, RefundKind.processing);
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

    test('knows when a refund request is not settled yet', () {
      expect(
          OrderModel.fromJson({...json(), 'activeRefundRequestId': 'r1'})
              .refundRequestActive,
          isTrue);
      expect(OrderModel.fromJson(json()).refundRequestActive, isFalse);
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
      expect((mark.label, mark.kind), ('Fully refunded', RefundKind.full));
    });

    test('says Partially refunded when some money was paid back but not all',
        () {
      final mark = orderRefundLabel(
          paymentStatus: 'partially_refunded', refundedAmountMinor: 1080)!;
      expect(
          (mark.label, mark.kind), ('Partially refunded', RefundKind.partial));
    });

    test(
        'says Refund processing while an approved refund is still being paid back',
        () {
      final mark = orderRefundLabel(
          paymentStatus: 'captured', refundReservedAmountMinor: 1080)!;
      expect((mark.label, mark.kind),
          ('Refund processing', RefundKind.processing));
    });

    test('says Refund requested while a request still waits for the seller',
        () {
      final mark = orderRefundLabel(
          paymentStatus: 'captured', refundRequestActive: true)!;
      expect(
          (mark.label, mark.kind), ('Refund requested', RefundKind.processing));
    });

    test(
        'says Refund processing, not requested, once the seller approved and money is reserved',
        () {
      final mark = orderRefundLabel(
          paymentStatus: 'captured',
          refundRequestActive: true,
          refundReservedAmountMinor: 1080)!;
      expect((mark.label, mark.kind),
          ('Refund processing', RefundKind.processing));
    });

    test(
        'shows a refund in flight even when an earlier refund made the order partially refunded',
        () {
      final reserved = orderRefundLabel(
          paymentStatus: 'partially_refunded',
          refundedAmountMinor: 1080,
          refundReservedAmountMinor: 500)!;
      final requested = orderRefundLabel(
          paymentStatus: 'partially_refunded',
          refundedAmountMinor: 1080,
          refundRequestActive: true)!;
      expect(reserved.label, 'Refund processing');
      expect(requested.label, 'Refund requested');
    });

    test('shows nothing for an order with no refund', () {
      expect(orderRefundLabel(paymentStatus: 'captured'), isNull);
      expect(orderRefundLabel(), isNull);
    });
  });
}
