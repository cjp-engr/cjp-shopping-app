import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:toko_mart/features/auth/presentation/bloc/auth_event.dart';
import 'package:toko_mart/features/auth/presentation/bloc/auth_state.dart';
import 'package:toko_mart/features/orders/data/models/order_model.dart';
import 'package:toko_mart/features/orders/presentation/bloc/order_bloc.dart';
import 'package:toko_mart/features/orders/presentation/bloc/order_event.dart';
import 'package:toko_mart/features/orders/presentation/bloc/order_state.dart';
import 'package:toko_mart/features/orders/presentation/screens/orders_screen.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';

class MockOrderBloc extends MockBloc<OrderEvent, OrderState>
    implements OrderBloc {}

class MockAuthBloc extends MockBloc<AuthEvent, AuthState> implements AuthBloc {}

class MockRefundApi extends Mock implements RefundApi {}

OrderModel _order(String id, String status, String payment, String itemName,
        {List<Map<String, Object>> refunded = const []}) =>
    OrderModel.fromJson({
      '_id': id,
      'status': status,
      'subtotal': 10,
      'total': 12,
      'createdAt': '2026-10-17T00:00:00.000Z',
      'paymentStatus': payment,
      'items': [
        {
          '_id': 'line-$id',
          'product': 'p-$id',
          'productName': itemName,
          'productPrice': 10,
          'quantity': 1
        }
      ],
      'refundedItems': refunded,
    });

void main() {
  late MockOrderBloc orders;
  late MockRefundApi refunds;

  setUp(() {
    orders = MockOrderBloc();
    refunds = MockRefundApi();
    when(() => orders.state)
        .thenReturn(const OrderState(status: OrderStatus.success));
  });

  Future<void> pump(WidgetTester tester) async {
    // A tab's empty-state button is wider than its box in the test font (Ahem); that overflow is not
    // what these tests are about, so it is the only error let through.
    final previous = FlutterError.onError;
    FlutterError.onError = (details) {
      if (details.exceptionAsString().contains('overflowed')) return;
      previous?.call(details);
    };
    addTearDown(() => FlutterError.onError = previous);
    final auth = MockAuthBloc();
    when(() => auth.state).thenReturn(const AuthState());
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: RepositoryProvider<RefundApi>.value(
            value: refunds,
            child: MultiBlocProvider(providers: [
              BlocProvider<OrderBloc>.value(value: orders),
              BlocProvider<AuthBloc>.value(value: auth),
            ], child: const OrdersScreen()))));
    await tester.pumpAndSettle();
  }

  testWidgets('no tab shows a count, whatever the buyer has', (tester) async {
    when(() => orders.state)
        .thenReturn(OrderState(status: OrderStatus.success, orders: [
      _order('a', 'pending', 'authorized', 'Pending Mug'),
      _order('b', 'pending', 'authorized', 'Second Mug'),
      _order('c', 'delivered', 'captured', 'Kept Mug'),
      _order('d', 'shipped', 'captured', 'Shipped Mug'),
    ]));

    await pump(tester);

    final labels = tester
        .widgetList<Text>(find.descendant(
            of: find.byType(TabBar), matching: find.byType(Text)))
        .map((t) => t.data!)
        .toList();
    expect(labels, hasLength(7));
    expect(labels.where((l) => int.tryParse(l) != null), isEmpty);
    expect(labels, contains('Return/Refund'));
  });

  testWidgets(
      'opening the screen does not ask for refunds just to draw a count',
      (tester) async {
    await pump(tester);

    verifyNever(() => refunds.completed(any()));
  });

  testWidgets(
      'Complete keeps a partly refunded order with its refunded item marked and drops a fully refunded one',
      (tester) async {
    when(() => orders.state)
        .thenReturn(OrderState(status: OrderStatus.success, orders: [
      _order('a', 'delivered', 'captured', 'Kept Mug'),
      _order('b', 'delivered', 'partially_refunded', 'Partly Mug', refunded: [
        {'lineId': 'line-b', 'refunded': 1, 'processing': 0}
      ]),
      _order('c', 'delivered', 'refunded', 'Gone Mug', refunded: [
        {'lineId': 'line-c', 'refunded': 1, 'processing': 0}
      ]),
    ]));
    await pump(tester);

    await tester.tap(find.text('Complete'));
    await tester.pumpAndSettle();

    expect(find.text('Kept Mug'), findsOneWidget);
    expect(find.text('Partly Mug'), findsOneWidget);
    expect(find.text('Gone Mug'), findsNothing);
    expect(find.text('Refunded'), findsOneWidget);
  });
}
