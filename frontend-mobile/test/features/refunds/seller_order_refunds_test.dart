import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/refunds/presentation/seller_order_refunds.dart';

class MockRefundApi extends Mock implements RefundApi {}

RefundRequestData _request(String id, String state, String product) =>
    RefundRequestData.fromJson({
      'id': id,
      'orderId': '6ad4d9ac1234567890abcdef',
      'state': state,
      'amountMinor': 3239,
      'currency': 'usd',
      'reasonCode': 'damaged',
      'description': 'Broken',
      'buyerName': 'Buyer1 Monte Cristo',
      'units': [
        {
          'lineId': 'a',
          'ordinal': 1,
          'productName': product,
          'merchandiseMinor': 2999,
          'taxMinor': 240
        }
      ],
    });

void main() {
  late MockRefundApi api;
  setUp(() => api = MockRefundApi());

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
            body: SingleChildScrollView(
                child: SellerOrderRefunds(orderId: 'o1', api: api)))));
    await tester.pumpAndSettle();
  }

  testWidgets(
      'lists every refund request of the order as a seller card under a Refunds title',
      (tester) async {
    when(() => api.sellerOrderRefunds('o1')).thenAnswer((_) async => [
          _request('r1', 'refunded', 'Wireless Mouse'),
          _request('r2', 'rejected', 'Wireless Keyboard'),
        ]);

    await pump(tester);

    expect(find.text('Refunds'), findsOneWidget);
    expect(find.byKey(const ValueKey('refund-card-r1')), findsOneWidget);
    expect(find.byKey(const ValueKey('refund-card-r2')), findsOneWidget);
    expect(find.text('Wireless Mouse'), findsOneWidget);
    // On the order's own screen: no View Details back to the same order.
    expect(find.text('View Details'), findsNothing);
  });

  testWidgets('draws nothing when the order has no refund requests',
      (tester) async {
    when(() => api.sellerOrderRefunds('o1')).thenAnswer((_) async => []);

    await pump(tester);

    expect(find.text('Refunds'), findsNothing);
    expect(find.byType(Card), findsNothing);
  });

  testWidgets('a failed load leaves the section out and never breaks the order',
      (tester) async {
    when(() => api.sellerOrderRefunds('o1')).thenThrow(Exception('offline'));

    await pump(tester);

    expect(find.text('Refunds'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
