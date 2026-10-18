import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/features/orders/data/models/order_model.dart';
import 'package:toko_mart/features/seller/data/models/seller_order_model.dart';

Map<String, dynamic> _baseJson() => {
      '_id': 'order-1',
      'status': 'pending',
      'subtotal': 100,
      'total': 110,
      'createdAt': '2026-10-17T00:00:00.000Z',
    };

Map<String, dynamic> _paymentJson() => {
      'paymentFlowVersion': 'manual_capture',
      'paymentStatus': 'authorized',
      'placedAt': '2026-10-17T01:00:00.000Z',
      'acceptBy': '2026-10-18T01:00:00.000Z',
      'authorizationExpiresAt': '2026-10-24T01:00:00.000Z',
    };

void main() {
  test('buyer parses the refund review code without exposing internal error details', () {
    final order = OrderModel.fromJson({..._baseJson(), 'paymentError': const {'code': 'refund_review', 'message': 'internal details'}});
    expect(order.paymentErrorCode, 'refund_review');
  });
  test('a pending order is cancellable only when the server says so', () {
    expect(SellerOrderData.fromJson({..._baseJson(), 'paymentMethod': {'type': 'credit-card'}}).canCancel, isFalse);
    expect(SellerOrderData.fromJson({..._baseJson(), 'paymentMethod': {'type': 'cash-on-delivery'}}).canCancel, isFalse);
    expect(SellerOrderData.fromJson({..._baseJson(), 'paymentMethod': {'type': 'cash-on-delivery'}, 'canSellerCancelPending': true}).canCancel, isTrue);
    expect(SellerOrderData.fromJson({..._baseJson(), ..._paymentJson(), 'paymentMethod': {'type': 'credit-card'}, 'canSellerCancelPending': true}).canCancel, isTrue);
  });
  test('after pending only cash on delivery stays cancellable', () {
    final cod = {..._baseJson(), 'status': 'preparing', 'paymentMethod': {'type': 'cash-on-delivery'}};
    expect(SellerOrderData.fromJson(cod).canCancel, isTrue);
    expect(SellerOrderData.fromJson({...cod, 'paymentMethod': {'type': 'credit-card'}}).canCancel, isFalse);
    expect(SellerOrderData.fromJson({...cod, ..._paymentJson()}).canCancel, isFalse);
  });
  group('OrderModel payment fields', () {
    test('parses all payment fields', () {
      final order = OrderModel.fromJson({..._baseJson(), ..._paymentJson()});

      expect(order.paymentFlowVersion, 'manual_capture');
      expect(order.paymentStatus, 'authorized');
      expect(order.placedAt!.toUtc(), DateTime.utc(2026, 10, 17, 1));
      expect(order.acceptBy!.toUtc(), DateTime.utc(2026, 10, 18, 1));
      expect(
          order.authorizationExpiresAt!.toUtc(), DateTime.utc(2026, 10, 24, 1));
    });

    test('absent fields keep legacy defaults', () {
      final order = OrderModel.fromJson(_baseJson());

      expect(order.paymentFlowVersion, 'legacy');
      expect(order.paymentStatus, isNull);
      expect(order.placedAt, isNull);
      expect(order.acceptBy, isNull);
      expect(order.authorizationExpiresAt, isNull);
    });

    test('empty paymentFlowVersion falls back to legacy', () {
      final order =
          OrderModel.fromJson({..._baseJson(), 'paymentFlowVersion': ''});

      expect(order.paymentFlowVersion, 'legacy');
    });

    test('invalid or non-string dates yield null instead of throwing', () {
      final order = OrderModel.fromJson({
        ..._baseJson(),
        'placedAt': 'not-a-date',
        'acceptBy': 12345,
        'authorizationExpiresAt': const {'unexpected': true},
      });

      expect(order.placedAt, isNull);
      expect(order.acceptBy, isNull);
      expect(order.authorizationExpiresAt, isNull);
    });

    test('unknown payment values and extra keys are ignored', () {
      final order = OrderModel.fromJson({
        ..._baseJson(),
        'paymentFlowVersion': 'future_flow',
        'paymentStatus': 'some_new_status',
        'somethingElse': 42,
      });

      expect(order.paymentFlowVersion, 'future_flow');
      expect(order.paymentStatus, 'some_new_status');
    });
  });

  group('SellerOrderData payment fields', () {
    test('parses all payment fields', () {
      final order =
          SellerOrderData.fromJson({..._baseJson(), ..._paymentJson()});

      expect(order.paymentFlowVersion, 'manual_capture');
      expect(order.paymentStatus, 'authorized');
      expect(order.placedAt!.toUtc(), DateTime.utc(2026, 10, 17, 1));
      expect(order.acceptBy!.toUtc(), DateTime.utc(2026, 10, 18, 1));
      expect(
          order.authorizationExpiresAt!.toUtc(), DateTime.utc(2026, 10, 24, 1));
    });

    test('absent fields keep legacy defaults', () {
      final order = SellerOrderData.fromJson(_baseJson());

      expect(order.paymentFlowVersion, 'legacy');
      expect(order.paymentStatus, isNull);
      expect(order.placedAt, isNull);
      expect(order.acceptBy, isNull);
      expect(order.authorizationExpiresAt, isNull);
    });

    test('invalid or non-string dates yield null instead of throwing', () {
      final order = SellerOrderData.fromJson({
        ..._baseJson(),
        'placedAt': 'not-a-date',
        'acceptBy': 12345,
        'authorizationExpiresAt': ['x'],
      });

      expect(order.placedAt, isNull);
      expect(order.acceptBy, isNull);
      expect(order.authorizationExpiresAt, isNull);
    });

    test('unknown payment values and extra keys are ignored', () {
      final order = SellerOrderData.fromJson({
        ..._baseJson(),
        'paymentFlowVersion': 'future_flow',
        'paymentStatus': 'some_new_status',
        'somethingElse': 42,
      });

      expect(order.paymentFlowVersion, 'future_flow');
      expect(order.paymentStatus, 'some_new_status');
    });

    test('copyWith preserves payment fields', () {
      final order =
          SellerOrderData.fromJson({..._baseJson(), ..._paymentJson()})
              .copyWith(status: 'preparing');

      expect(order.status, 'preparing');
      expect(order.paymentFlowVersion, 'manual_capture');
      expect(order.paymentStatus, 'authorized');
      expect(order.acceptBy!.toUtc(), DateTime.utc(2026, 10, 18, 1));
    });
  });
}
