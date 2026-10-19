import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:toko_mart/features/auth/presentation/bloc/auth_event.dart';
import 'package:toko_mart/features/auth/presentation/bloc/auth_state.dart';
import 'package:toko_mart/features/orders/presentation/bloc/order_bloc.dart';
import 'package:toko_mart/features/orders/presentation/bloc/order_event.dart';
import 'package:toko_mart/features/orders/presentation/bloc/order_state.dart';
import 'package:toko_mart/features/orders/presentation/screens/orders_screen.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';

class MockOrderBloc extends MockBloc<OrderEvent, OrderState>
    implements OrderBloc {}

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

class MockRefundApi extends Mock implements RefundApi {}

SellerRefundPage _approved(int total) => SellerRefundPage.fromJson({
      'page': 1,
      'pages': 1,
      'total': total,
      'requests': [
        for (var i = 0; i < total; i++)
          {'id': 'r$i', 'state': 'processing', 'amountMinor': 500}
      ],
    });

void main() {
  late MockRefundApi refunds;

  setUp(() {
    refunds = MockRefundApi();
    final orders = MockOrderBloc();
    final auth = MockAuthBloc();
    when(() => orders.state)
        .thenReturn(const OrderState(status: OrderStatus.success));
    when(() => auth.state).thenReturn(const AuthState());
    _blocs = (orders, auth);
  });

  Future<void> pump(WidgetTester tester, {bool withApi = true}) async {
    final (orders, auth) = _blocs;
    // The first tab's empty-state button is wider than the box in the test font (Ahem); that overflow
    // is not what these tests are about, so it is the only error let through.
    final previous = FlutterError.onError;
    FlutterError.onError = (details) {
      if (details.exceptionAsString().contains('overflowed')) return;
      previous?.call(details);
    };
    addTearDown(() => FlutterError.onError = previous);
    Widget home = MultiBlocProvider(providers: [
      BlocProvider<OrderBloc>.value(value: orders),
      BlocProvider<AuthBloc>.value(value: auth),
    ], child: const OrdersScreen());
    if (withApi) {
      home = RepositoryProvider<RefundApi>.value(value: refunds, child: home);
    }
    await tester.pumpWidget(MaterialApp(theme: AppTheme.light, home: home));
    await tester.pumpAndSettle();
  }

  Finder badgeOnTab() => find.descendant(
      of: find.ancestor(
          of: find.text('Return/Refund'), matching: find.byType(Row)),
      matching: find.text('3'));

  testWidgets('the Return/Refund tab shows how many approved refunds there are',
      (tester) async {
    when(() => refunds.completed(1)).thenAnswer((_) async => _approved(3));

    await pump(tester);

    expect(badgeOnTab(), findsOneWidget);
  });

  testWidgets('no badge while there are no approved refunds', (tester) async {
    when(() => refunds.completed(1)).thenAnswer((_) async => _approved(0));

    await pump(tester);

    expect(badgeOnTab(), findsNothing);
    expect(find.text('Return/Refund'), findsOneWidget);
  });

  testWidgets(
      'a failing count or a missing refund API never breaks the tab bar',
      (tester) async {
    when(() => refunds.completed(1)).thenThrow(Exception('offline'));
    await pump(tester);
    expect(find.text('Return/Refund'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await pump(tester, withApi: false);
    expect(find.text('Return/Refund'), findsOneWidget);
  });
}

late (MockOrderBloc, MockAuthBloc) _blocs;
