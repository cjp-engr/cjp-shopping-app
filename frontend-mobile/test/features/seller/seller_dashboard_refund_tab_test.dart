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

SellerRefundPage _page(String state, int total,
        {int inProgress = 0, int approved = 0, int rejected = 0}) =>
    SellerRefundPage.fromJson({
      'page': 1,
      'pages': 1,
      'total': total,
      'counts': {
        'in_progress': inProgress,
        'approved': approved,
        'rejected': rejected
      },
      'requests': [
        for (var i = 0; i < total; i++)
          {
            'id': '$state$i',
            'orderId': '6ad4d9ac1234567890abcde$i',
            'state': state,
            'canDecide': state == 'requested',
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
    when(() => refunds.sellerList(1, 'in_progress')).thenAnswer((_) async =>
        _page('requested', 2, inProgress: 2, approved: 3, rejected: 1));
    when(() => refunds.sellerList(1, 'approved')).thenAnswer((_) async =>
        _page('processing', 1, inProgress: 2, approved: 3, rejected: 1));
    when(() => refunds.sellerList(1, 'rejected')).thenAnswer((_) async =>
        _page('rejected', 0, inProgress: 2, approved: 3, rejected: 1));
  });

  Future<void> pumpDashboard(WidgetTester tester,
      {String initialTab = 'orders'}) async {
    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.light,
      home: RepositoryProvider<RefundApi>.value(
        value: refunds,
        child: BlocProvider(
          create: (_) => SellerBloc(repo),
          child: SellerDashboardScreen(initialTab: initialTab),
        ),
      ),
    ));
    await tester.pump();
    await tester.pump();
    await tester.pump();
  }

  testWidgets(
      'Return/Refund is a dashboard tab after Vouchers, badged with the total number of requests',
      (tester) async {
    await pumpDashboard(tester);

    final tabs = tester
        .widgetList<Tab>(find.byType(Tab))
        .map((t) => t.text ?? '')
        .toList();
    expect(tabs.last, isEmpty); // the badged tab builds its own child
    expect(find.text('Vouchers'), findsOneWidget);
    expect(find.text('Return/Refund'), findsOneWidget);
    expect(
        tester.getTopLeft(find.text('Return/Refund')).dx >
            tester.getTopLeft(find.text('Vouchers')).dx,
        isTrue);
    expect(find.descendant(of: find.byType(TabBar), matching: find.text('6')),
        findsOneWidget);
    // The old entry points are gone.
    expect(find.byTooltip('Refund requests'), findsNothing);
  });

  testWidgets('the Orders tab no longer has a Return/Refund chip',
      (tester) async {
    await pumpDashboard(tester);

    // One Return/Refund label: the tab. No second one among the order status chips.
    expect(find.text('Return/Refund'), findsOneWidget);
  });

  testWidgets(
      'opening it shows In Progress, Approved and Rejected with counts, on In Progress first',
      (tester) async {
    await pumpDashboard(tester, initialTab: 'refunds');
    await tester.pumpAndSettle();

    expect(find.text('In Progress'), findsOneWidget);
    expect(find.text('Approved'), findsOneWidget);
    expect(find.text('Rejected'), findsOneWidget);
    expect(find.text('Buyer0 Monte Cristo'), findsOneWidget);
    expect(find.text('Awaiting seller review'), findsWidgets);
    expect(find.text('Approve refund'), findsWidgets);
    verify(() => refunds.sellerList(1, 'in_progress')).called(greaterThan(0));
    verifyNever(() => refunds.sellerList(1, 'approved'));
  });

  testWidgets('choosing Approved loads that group and shows its requests',
      (tester) async {
    await pumpDashboard(tester, initialTab: 'refunds');
    await tester.pumpAndSettle();

    await tester.tap(find.text('Approved'));
    await tester.pumpAndSettle();

    verify(() => refunds.sellerList(1, 'approved')).called(1);
    expect(find.text('Refund processing'), findsOneWidget);
    expect(find.text('You approved this request. The refund is processing.'),
        findsOneWidget);
    expect(find.text('Approve refund'), findsNothing);
  });

  testWidgets('an empty group says so', (tester) async {
    await pumpDashboard(tester, initialTab: 'refunds');
    await tester.pumpAndSettle();

    await tester.tap(find.text('Rejected'));
    await tester.pumpAndSettle();

    expect(find.text('No rejected requests.'), findsOneWidget);
  });

  testWidgets(
      'a failing refund count never breaks the dashboard and leaves no badge',
      (tester) async {
    when(() => refunds.sellerList(1, 'in_progress'))
        .thenThrow(Exception('offline'));
    await pumpDashboard(tester);

    expect(find.text('Return/Refund'), findsOneWidget);
    expect(find.descendant(of: find.byType(TabBar), matching: find.text('6')),
        findsNothing);
    expect(tester.takeException(), isNull);
  });
}
