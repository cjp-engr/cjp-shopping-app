import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/seller/domain/repositories/seller_repository.dart';
import 'package:toko_mart/features/seller/domain/seller_cancellation.dart';
import 'package:toko_mart/features/seller/domain/seller_status_result.dart';
import 'package:toko_mart/features/seller/keys.dart';
import 'package:toko_mart/features/seller/presentation/bloc/seller_bloc.dart';
import 'package:toko_mart/features/seller/presentation/screens/seller_dashboard_screen.dart';

import 'seller_test_data.dart';

class MockSellerRepository extends Mock implements SellerRepository {}

void main() {
  final sellerKeys = SellerKeys();
  late MockSellerRepository repo;

  setUp(() {
    repo = MockSellerRepository();
    when(() => repo.getMyProducts()).thenAnswer((_) async => []);
  });

  Future<void> pumpDashboard(WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: AppTheme.light,
      home: BlocProvider(
        create: (_) => SellerBloc(repo),
        child: const SellerDashboardScreen(initialTab: 'orders'),
      ),
    ));
    await tester.pump();
    await tester.pump();
  }

  Finder cancelButton(String id) =>
      find.byKey(sellerKeys.cancelOrderButton(id));

  testWidgets(
      'a pending order offers Cancel only when the server says it can be cancelled',
      (tester) async {
    when(() => repo.getSellerOrders()).thenAnswer((_) async => [
          sellerOrder(id: 'can', canSellerCancelPending: true),
          sellerOrder(id: 'cannot', canSellerCancelPending: false),
        ]);
    await pumpDashboard(tester);

    expect(cancelButton('can'), findsOneWidget);
    expect(cancelButton('cannot'), findsNothing);
  });

  testWidgets(
      'confirming without a reason shows the requirement and sends nothing',
      (tester) async {
    when(() => repo.getSellerOrders())
        .thenAnswer((_) async => [sellerOrder(canSellerCancelPending: true)]);
    await pumpDashboard(tester);

    await tester.tap(cancelButton('order-1'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Yes, Cancel'));
    await tester.pumpAndSettle();

    expect(
        find.text(
            'Enter a reason for the cancellation. The buyer will see it.'),
        findsOneWidget);
    expect(find.byKey(sellerKeys.cancelReasonField), findsOneWidget);
    verifyNever(() => repo.cancelOrder(any(), any()));
  });

  testWidgets(
      'a reason sends one cancellation and shows the release as in progress',
      (tester) async {
    var loads = 0;
    when(() => repo.getSellerOrders()).thenAnswer((_) async {
      loads++;
      return loads < 2
          ? [sellerOrder(canSellerCancelPending: true)]
          : [
              sellerOrder(status: 'cancelled', paymentStatus: 'release_pending')
            ];
    });
    when(() => repo.cancelOrder('order-1', 'Out of stock')).thenAnswer(
        (_) async => const SellerCancelOutcome(
            paymentOperation: SellerPaymentOperation.pending));
    await pumpDashboard(tester);

    await tester.tap(cancelButton('order-1'));
    await tester.pumpAndSettle();
    await tester.enterText(
        find.byKey(sellerKeys.cancelReasonField), '  Out of stock ');
    await tester.tap(find.text('Yes, Cancel'));
    await tester.pumpAndSettle();

    verify(() => repo.cancelOrder('order-1', 'Out of stock')).called(1);
    expect(find.text('Order cancelled. The card hold is being released.'),
        findsOneWidget);
    expect(find.text('Order cancelled. The card hold was released.'),
        findsNothing);
  });

  testWidgets(
      'losing the race shows the conflict message and the real order state',
      (tester) async {
    var loads = 0;
    when(() => repo.getSellerOrders()).thenAnswer((_) async {
      loads++;
      return loads < 2
          ? [sellerOrder(canSellerCancelPending: true)]
          : [
              sellerOrder(
                  status: 'preparing',
                  paymentStatus: 'captured',
                  paymentFlowVersion: 'manual_capture',
                  paymentType: 'credit-card')
            ];
    });
    when(() => repo.cancelOrder(any(), any())).thenThrow(
        const SellerOrderException('x', code: 'cancellation_conflict'));
    await pumpDashboard(tester);

    await tester.tap(cancelButton('order-1'));
    await tester.pumpAndSettle();
    await tester.enterText(
        find.byKey(sellerKeys.cancelReasonField), 'Out of stock');
    await tester.tap(find.text('Yes, Cancel'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Refresh to see its latest status'),
        findsOneWidget);
    expect(cancelButton('order-1'), findsNothing);
  });
}
