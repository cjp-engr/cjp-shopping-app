import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/features/orders/data/models/order_model.dart';
import 'package:toko_mart/features/orders/domain/order_tabs.dart';

OrderModel _order(String id, String status, [String? paymentStatus]) =>
    OrderModel.fromJson({
      '_id': id,
      'status': status,
      'subtotal': 100,
      'total': 110,
      'createdAt': '2026-10-17T00:00:00.000Z',
      if (paymentStatus != null) 'paymentStatus': paymentStatus,
    });

void main() {
  final orders = [
    _order('delivered-plain', 'delivered', 'captured'),
    _order('delivered-partial', 'delivered', 'partially_refunded'),
    _order('delivered-refunded', 'delivered', 'refunded'),
    _order('delivered-cod', 'delivered', 'not_required'),
    _order('delivered-old', 'delivered'),
    _order('shipped', 'shipped', 'authorized'),
    _order('cancelled-refunded', 'cancelled', 'refunded'),
  ];
  List<String> ids(List<OrderModel> list) => list.map((o) => o.id).toList();

  test('a fully refunded order is known by its payment status only', () {
    expect(isFullyRefunded(_order('a', 'delivered', 'refunded')), isTrue);
    expect(isFullyRefunded(_order('a', 'delivered', 'partially_refunded')),
        isFalse);
    expect(isFullyRefunded(_order('a', 'delivered', 'captured')), isFalse);
    expect(isFullyRefunded(_order('a', 'delivered')), isFalse);
  });

  test(
      'Complete drops fully refunded orders and keeps every other delivered order',
      () {
    final shown =
        ordersForTab(orders, const ['delivered'], hideFullyRefunded: true);
    expect(ids(shown), [
      'delivered-plain',
      'delivered-partial',
      'delivered-cod',
      'delivered-old'
    ]);
  });

  test('other tabs are unchanged, including a refunded cancelled order', () {
    expect(ids(ordersForTab(orders, const ['shipped'])), ['shipped']);
    expect(
        ids(ordersForTab(orders, const ['cancelled'])), ['cancelled-refunded']);
  });
}
