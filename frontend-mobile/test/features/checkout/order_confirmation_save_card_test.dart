import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/services/card_service.dart';
import 'package:toko_mart/features/checkout/screens/order_confirmation_screen.dart';
import 'package:toko_mart/features/orders/domain/entities/order_entity.dart';

class _MockCardService extends Mock implements CardService {}

const _order = OrderEntity(
  id: 'ord12345abcdef',
  userId: 'user-1',
  items: [
    OrderItemEntity(
      productId: 'p1',
      productName: 'Test Sneakers',
      productImage: '',
      price: 50,
      quantity: 1,
    ),
  ],
  shippingAddress: OrderAddressEntity(
    street: '123 Test Street',
    city: 'Manila',
    state: 'Metro Manila',
    zipCode: '1000',
    country: 'PH',
  ),
  paymentType: 'credit-card',
  subtotal: 50,
  productDiscount: 0,
  discount: 0,
  tax: 0,
  shipping: 0,
  total: 50,
  status: 'pending',
  createdAt: null,
);

Widget _app(CardService svc, {String? pmId = 'pm_1', String? brand = 'visa'}) =>
    RepositoryProvider<CardService>.value(
      value: svc,
      child: MaterialApp(
        home: OrderConfirmationScreen(
          paymentIntentId: 'pi_1',
          order: _order,
          cardBrand: brand,
          cardLast4: '4242',
          paymentMethodId: pmId,
          onContinueShopping: () {},
        ),
      ),
    );

void main() {
  late _MockCardService svc;
  setUp(() => svc = _MockCardService());

  testWidgets('no dialog without paymentMethodId', (t) async {
    await t.pumpWidget(_app(svc, pmId: null));
    await t.pumpAndSettle();
    expect(find.text('Save this card?'), findsNothing);
  });

  testWidgets('Not Now dismisses without saving', (t) async {
    await t.pumpWidget(_app(svc));
    await t.pumpAndSettle();
    expect(find.text('Save this card?'), findsOneWidget);
    await t.tap(find.text('Not Now'));
    await t.pumpAndSettle();
    verifyNever(() => svc.saveCard(any()));
  });

  testWidgets('Save Card success shows success snackbar', (t) async {
    when(() => svc.saveCard('pm_1')).thenAnswer((_) async {});
    await t.pumpWidget(_app(svc));
    await t.pumpAndSettle();
    await t.tap(find.text('Save Card'));
    await t.pumpAndSettle();
    verify(() => svc.saveCard('pm_1')).called(1);
    expect(find.text('Card saved successfully'), findsOneWidget);
  });

  testWidgets('failure shows error snackbar and Retry works', (t) async {
    var calls = 0;
    when(() => svc.saveCard('pm_1')).thenAnswer((_) async {
      if (++calls == 1) throw CardSavingException('boom');
    });
    await t.pumpWidget(_app(svc));
    await t.pumpAndSettle();
    await t.tap(find.text('Save Card'));
    await t.pumpAndSettle();
    expect(find.text('boom'), findsOneWidget);
    await t.tap(find.text('Retry'));
    await t.pumpAndSettle();
    expect(calls, 2);
    expect(find.text('Card saved successfully'), findsOneWidget);
  });
}
