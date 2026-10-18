import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/utils/order_payment_notice.dart';
import 'package:toko_mart/features/orders/data/models/order_model.dart';
import 'package:toko_mart/features/orders/domain/entities/order_entity.dart';

OrderEntity _order({
  String status = 'cancelled',
  String? cancelReason,
  String? cancelledByRole,
  DateTime? cancelledAt,
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
    cancelReason: cancelReason,
    cancelledByRole: cancelledByRole,
    cancelledAt: cancelledAt,
  );
}

void main() {
  group('cancelledBySellerNotice', () {
    test('tells the buyer the seller cancelled, with the reason', () {
      final notice = cancelledBySellerNotice(_order(
          cancelledByRole: 'seller', cancelReason: 'Out of stock'));
      expect(notice?.title, 'Cancelled by the seller');
      expect(notice?.body, contains('Out of stock'));
    });

    test('still says the seller cancelled when no reason was kept', () {
      expect(cancelledBySellerNotice(_order(cancelledByRole: 'seller'))?.body,
          'The seller cancelled this order.');
    });

    test('shows nothing for other actors, older cancellations or live orders', () {
      expect(cancelledBySellerNotice(_order(cancelledByRole: 'buyer', cancelReason: 'x')), isNull);
      expect(cancelledBySellerNotice(_order(cancelledByRole: 'system')), isNull);
      expect(cancelledBySellerNotice(_order()), isNull);
      expect(cancelledBySellerNotice(_order(status: 'pending', cancelledByRole: 'seller')), isNull);
    });
  });

  group('OrderModel cancellation fields', () {
    Map<String, dynamic> json(Map<String, dynamic> extra) => {
          '_id': 'o1',
          'userId': 'u1',
          'status': 'cancelled',
          'items': <dynamic>[],
          'shippingAddress': <String, dynamic>{},
          'paymentMethod': {'type': 'credit-card'},
          'createdAt': '2026-10-18T00:00:00.000Z',
          ...extra,
        };

    test('parses who cancelled and when', () {
      final order = OrderModel.fromJson(json({
        'cancelledByRole': 'seller',
        'cancelledAt': '2026-10-18T01:00:00.000Z',
        'cancelReason': 'Out of stock',
      }));
      expect(order.cancelledByRole, 'seller');
      expect(order.cancelledAt, DateTime.utc(2026, 10, 18, 1));
      expect(order.cancelReason, 'Out of stock');
    });

    test('older cancellations and bad values never throw', () {
      final older = OrderModel.fromJson(json({}));
      expect(older.cancelledByRole, isNull);
      expect(older.cancelledAt, isNull);
      final bad = OrderModel.fromJson(
          json({'cancelledByRole': 7, 'cancelledAt': 'not-a-date'}));
      expect(bad.cancelledByRole, isNull);
      expect(bad.cancelledAt, isNull);
    });
  });
}
