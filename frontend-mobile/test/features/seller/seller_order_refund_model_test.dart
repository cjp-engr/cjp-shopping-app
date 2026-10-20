import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/features/seller/data/models/seller_order_model.dart';

Map<String, dynamic> _json({Object? marks, int reserved = 0}) => {
      '_id': 'order-1',
      'status': 'delivered',
      'subtotal': 25,
      'total': 32,
      'createdAt': '2026-10-17T00:00:00.000Z',
      'paymentStatus': 'partially_refunded',
      'refundedAmountMinor': 1080,
      'refundReservedAmountMinor': reserved,
      'items': [
        {
          '_id': 'line-1',
          'product': 'p1',
          'productName': 'Mug',
          'productPrice': 10,
          'quantity': 2
        },
      ],
      if (marks != null) 'refundedItems': marks,
    };

void main() {
  test(
      'keeps each item line id, the refunded item marks and the reserved amount',
      () {
    final order = SellerOrderData.fromJson(_json(marks: [
      {'lineId': 'line-1', 'refunded': 1, 'processing': 1}
    ], reserved: 540));

    expect(order.items.single.lineId, 'line-1');
    expect(order.refundedItems.single.lineId, 'line-1');
    expect((
      order.refundedItems.single.refunded,
      order.refundedItems.single.processing
    ), (
      1,
      1
    ));
    expect(order.refundReservedAmountMinor, 540);
    expect(order.refundedAmountMinor, 1080);
  });

  test('an order from an older server has no marks', () {
    final order = SellerOrderData.fromJson(_json());
    expect(order.refundedItems, isEmpty);
    expect(order.refundReservedAmountMinor, 0);
  });

  test('changing the status keeps the refund details', () {
    final order = SellerOrderData.fromJson(_json(marks: [
      {'lineId': 'line-1', 'refunded': 2, 'processing': 0}
    ], reserved: 100));

    final changed = order.copyWith(status: 'cancelled');

    expect(changed.refundedItems.single.refunded, 2);
    expect(changed.refundReservedAmountMinor, 100);
  });
}
