import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/seller/domain/repositories/seller_repository.dart';
import 'package:toko_mart/features/seller/presentation/bloc/seller_bloc.dart';
import 'package:toko_mart/features/seller/presentation/screens/seller_dashboard_screen.dart';

import 'seller_test_data.dart';

class MockSellerRepository extends Mock implements SellerRepository {}

class MockRefundApi extends Mock implements RefundApi {}

SellerRefundPage _page(int total) => SellerRefundPage.fromJson({
      'page': 1,
      'pages': 1,
      'total': total,
      'requests': [
        for (var i = 0; i < total; i++)
          {
            'id': 'r$i',
            'orderId': '6ad4d9ac1234567890abcde$i',
            'state': 'requested',
            'canDecide': true,
            'amountMinor': 1080,
            'currency': 'usd',
            'reasonCode': 'damaged',
            'description': 'Broken',
            'buyerName': 'Buyer$i Monte Cristo',
            'units': [
              {
                'lineId': 'a',
                'ordinal': 1,
                'productName': 'Mug',
                'merchandiseMinor': 1000,
                'taxMinor': 80
              }
            ],
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
    when(() => repo.getSellerOrders())
        .thenAnswer((_) async => [sellerOrder(status: 'delivered')]);
  });

  Future<void> pumpDashboard(WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.light,
      home: RepositoryProvider<RefundApi>.value(
        value: refunds,
        child: BlocProvider(
          create: (_) => SellerBloc(repo),
          child: const SellerDashboardScreen(initialTab: 'orders'),
        ),
      ),
    ));
    await tester.pump();
    await tester.pump();
    await tester.pump();
  }

  testWidgets('the Orders tab gets a Return/Refund chip with the request count',
      (tester) async {
    when(() => refunds.sellerList(1)).thenAnswer((_) async => _page(2));
    await pumpDashboard(tester);

    expect(find.text('Return/Refund'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    // The old separate screen entry point in the app bar is gone.
    expect(find.byTooltip('Refund requests'), findsNothing);
  });

  testWidgets(
      'choosing the chip lists the requests as order-style cards with the decision controls',
      (tester) async {
    when(() => refunds.sellerList(1)).thenAnswer((_) async => _page(2));
    await pumpDashboard(tester);

    await tester.tap(find.text('Return/Refund'));
    await tester.pumpAndSettle();

    expect(find.text('Buyer0 Monte Cristo'), findsOneWidget);
    expect(find.text('Awaiting seller review'), findsWidgets);
    expect(find.text('Approve refund'), findsWidgets);
    expect(find.text('Reject request'), findsWidgets);
  });

  testWidgets('without refund requests there is no Return/Refund chip',
      (tester) async {
    when(() => refunds.sellerList(1)).thenAnswer((_) async => _page(0));
    await pumpDashboard(tester);

    expect(find.text('Return/Refund'), findsNothing);
  });

  testWidgets('a failing refund count never breaks the orders tab',
      (tester) async {
    when(() => refunds.sellerList(1)).thenThrow(Exception('offline'));
    await pumpDashboard(tester);

    expect(find.text('Return/Refund'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
