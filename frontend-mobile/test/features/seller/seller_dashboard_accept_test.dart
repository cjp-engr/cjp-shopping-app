import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/seller/domain/repositories/seller_repository.dart';
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

  Finder acceptButton(String id) =>
      find.byKey(sellerKeys.acceptOrderButton(id));

  testWidgets('pending order shows the accept label and the remaining time',
      (tester) async {
    when(() => repo.getSellerOrders()).thenAnswer((_) async => [
          sellerOrder(
              acceptBy: DateTime.now()
                  .add(const Duration(hours: 3, minutes: 20, seconds: 30))),
        ]);
    await pumpDashboard(tester);

    expect(find.text('Accept & start preparing'), findsOneWidget);
    expect(
        find.byKey(sellerKeys.acceptDeadlineText('order-1')), findsOneWidget);
    expect(find.textContaining('Accept within 3h'), findsOneWidget);
    expect(find.text('Charging payment…'), findsNothing);
  });

  testWidgets(
      'tapping accept twice sends one request and shows the info notice',
      (tester) async {
    when(() => repo.getSellerOrders()).thenAnswer((_) async => [sellerOrder()]);
    when(() => repo.updateOrderStatus('order-1', 'preparing',
        cancelReason: any(named: 'cancelReason'))).thenAnswer((_) async {
      await Future<void>.delayed(const Duration(milliseconds: 50));
      return SellerStatusResult.resolving;
    });
    await pumpDashboard(tester);

    await tester.tap(acceptButton('order-1'));
    await tester.pump();
    await tester.tap(acceptButton('order-1'), warnIfMissed: false);
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump();

    verify(() => repo.updateOrderStatus('order-1', 'preparing',
        cancelReason: any(named: 'cancelReason'))).called(1);
    expect(
        find.text(
            'Payment is being charged. This order will move to preparing when it finishes.'),
        findsOneWidget);
    // never shown as preparing on a 202
    expect(find.text('Preparing'), findsNothing);
  });

  testWidgets('a failed accept shows the mapped error', (tester) async {
    when(() => repo.getSellerOrders()).thenAnswer((_) async => [sellerOrder()]);
    when(() => repo.updateOrderStatus('order-1', 'preparing',
            cancelReason: any(named: 'cancelReason')))
        .thenThrow(const SellerOrderException('x', code: 'capture_failed'));
    await pumpDashboard(tester);

    await tester.tap(acceptButton('order-1'));
    await tester.pump();
    await tester.pump();

    expect(find.text('The payment could not be charged. Try accepting again.'),
        findsOneWidget);
  });

  testWidgets('a pending capture disables accept and polls silently until done',
      (tester) async {
    var polls = 0;
    when(() => repo.getSellerOrders()).thenAnswer((_) async {
      polls++;
      return polls < 3
          ? [sellerOrder(paymentStatus: 'capture_pending')]
          : [sellerOrder(status: 'preparing', paymentStatus: 'captured')];
    });
    await pumpDashboard(tester);

    expect(find.text('Charging payment…'), findsOneWidget);
    clearInteractions(repo);

    // first tick: still pending, list never flips to the loading spinner
    await tester.pump(const Duration(seconds: 5));
    await tester.pump();
    expect(find.text('Charging payment…'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator),
        findsOneWidget); // the button spinner only

    // second tick: captured, polling stops
    await tester.pump(const Duration(seconds: 5));
    await tester.pump();
    expect(find.text('Charging payment…'), findsNothing);
    expect(acceptButton('order-1'), findsNothing);

    clearInteractions(repo);
    await tester.pump(const Duration(seconds: 15));
    verifyNever(() => repo.getSellerOrders());
  });

  testWidgets('an expired deadline disables accept', (tester) async {
    when(() => repo.getSellerOrders()).thenAnswer((_) async => [
          sellerOrder(
              acceptBy: DateTime.now().subtract(const Duration(minutes: 1))),
        ]);
    await pumpDashboard(tester);

    expect(find.text('Acceptance window ended'), findsOneWidget);
    await tester.tap(acceptButton('order-1'));
    await tester.pump();
    verifyNever(() => repo.updateOrderStatus(any(), any(),
        cancelReason: any(named: 'cancelReason')));
  });
}
