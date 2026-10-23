import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/orders/domain/refund_mark.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/seller/data/models/seller_order_model.dart';
import 'package:toko_mart/features/seller/domain/repositories/seller_repository.dart';
import 'package:toko_mart/features/seller/presentation/bloc/seller_bloc.dart';
import 'package:toko_mart/features/seller/presentation/screens/seller_dashboard_screen.dart';

import 'seller_test_data.dart';

class MockSellerRepository extends Mock implements SellerRepository {}

class MockRefundApi extends Mock implements RefundApi {}

const _mouse = SellerOrderItemData(
    lineId: 'line-1',
    productId: 'p1',
    productName: 'Wireless Mouse',
    productImage: '',
    price: 10,
    quantity: 4);

RefundRequestData _refund(String id, String state) =>
    RefundRequestData.fromJson({
      'id': id,
      'orderId': 'order-1',
      'state': state,
      'amountMinor': 1080,
      'currency': 'usd',
      'reasonCode': 'damaged',
      'description': 'Broken',
      'buyerName': 'Buyer1 Monte Cristo',
      'units': [
        {
          'lineId': 'line-1',
          'ordinal': 1,
          'productName': 'Wireless Mouse',
          'merchandiseMinor': 1000,
          'taxMinor': 80
        }
      ],
    });

void main() {
  late MockSellerRepository repo;
  late MockRefundApi refunds;

  setUp(() {
    repo = MockSellerRepository();
    refunds = MockRefundApi();
    when(() => repo.getMyProducts()).thenAnswer((_) async => []);
    when(() => refunds.sellerList(any(), any())).thenAnswer((_) async =>
        SellerRefundPage.fromJson(
            {'page': 1, 'pages': 1, 'total': 0, 'requests': []}));
    when(() => refunds.sellerOrderRefunds(any())).thenAnswer((_) async => []);
  });

  Future<void> pumpOrders(
      WidgetTester tester, List<SellerOrderData> orders) async {
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    when(() => repo.getSellerOrders()).thenAnswer((_) async => orders);
    // The refund API sits above the app, as in the real app, so the order sheet can reach it too.
    await tester.pumpWidget(RepositoryProvider<RefundApi>.value(
        value: refunds,
        child: MaterialApp(
            theme: AppTheme.light,
            home: BlocProvider(
                create: (_) => SellerBloc(repo),
                child: const SellerDashboardScreen(initialTab: 'orders')))));
    for (var i = 0; i < 4; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
  }

  Future<void> openSheet(WidgetTester tester) async {
    await tester.tap(find.text('Wireless Mouse').first);
    await tester.pump();
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
  }

  final refundedOrder = sellerOrder(
    status: 'delivered',
    paymentStatus: 'partially_refunded',
    items: const [_mouse],
    total: 129.56,
    refundedAmountMinor: 1080,
    refundedItems: const [
      RefundedItemMark(lineId: 'line-1', refunded: 1, processing: 0)
    ],
  );

  testWidgets(
      'the order card says the order was partially refunded and marks the refunded item',
      (tester) async {
    await pumpOrders(tester, [refundedOrder]);

    expect(find.text('Partially refunded'), findsOneWidget);
    expect(find.text('1 of 4 refunded'), findsOneWidget);
  });

  testWidgets('an order without a refund shows no refund marks',
      (tester) async {
    await pumpOrders(tester, [
      sellerOrder(
          status: 'delivered', paymentStatus: 'captured', items: const [_mouse])
    ]);

    expect(find.text('Wireless Mouse'), findsOneWidget);
    expect(find.textContaining('refunded'), findsNothing);
    expect(find.text('Refund processing'), findsNothing);
  });

  testWidgets('a fully refunded order says so', (tester) async {
    await pumpOrders(tester, [
      sellerOrder(
          status: 'delivered',
          paymentStatus: 'refunded',
          items: const [_mouse],
          refundedAmountMinor: 12956,
          refundedItems: const [
            RefundedItemMark(lineId: 'line-1', refunded: 4, processing: 0)
          ])
    ]);

    expect(find.text('Fully refunded'), findsOneWidget);
    expect(find.text('Refunded'), findsOneWidget);
  });

  testWidgets(
      'the order sheet shows the refund status, the refunded item, the refunded amount, the net and the refund history',
      (tester) async {
    when(() => refunds.sellerOrderRefunds('order-1')).thenAnswer(
        (_) async => [_refund('r1', 'refunded'), _refund('r2', 'rejected')]);
    await pumpOrders(tester, [refundedOrder]);

    await openSheet(tester);

    expect(find.text('Partially refunded'), findsWidgets);
    expect(find.text('1 of 4 refunded'), findsWidgets);
    // The summary row and the refund card's status pill both say Refunded.
    expect(find.text('Refunded'), findsNWidgets(2));
    expect(find.text(r'-$10.80'), findsOneWidget);
    expect(find.text('Net after refunds'), findsOneWidget);
    expect(find.text(r'$118.76'), findsOneWidget);
    expect(find.text('Refunds'), findsOneWidget);
    expect(find.byKey(const ValueKey('refund-card-r1')), findsOneWidget);
    expect(find.byKey(const ValueKey('refund-card-r2')), findsOneWidget);
  });

  testWidgets('the order sheet of an order without a refund has none of it',
      (tester) async {
    await pumpOrders(tester, [
      sellerOrder(
          status: 'delivered',
          paymentStatus: 'captured',
          items: const [_mouse],
          total: 129.56)
    ]);

    await openSheet(tester);

    expect(find.text('Net after refunds'), findsNothing);
    expect(find.text('Refunds'), findsNothing);
    expect(find.textContaining('refunded'), findsNothing);
  });
}
