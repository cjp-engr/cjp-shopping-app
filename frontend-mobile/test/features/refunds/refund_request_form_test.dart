import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/refunds/presentation/refund_request_panel.dart';

class MockRefundApi extends Mock implements RefundApi {}

RefundEligibility _eligibility({int shipping = 1399, int available = 2}) =>
    RefundEligibility.fromJson({
      'eligible': true,
      'requestsEnabled': true,
      'currency': 'usd',
      'deadlineAt': '2026-10-25T14:38:00Z',
      'shippingRefundableMinor': shipping,
      'lines': [
        {
          'lineId': 'a',
          'productName': 'Hiking Backpack',
          'quantityOrdered': 2,
          'quantityAvailable': available,
          'availableUnitAmountsMinor': List.filled(available, 8639),
        },
        {
          'lineId': 'b',
          'productName': 'Mug',
          'quantityOrdered': 1,
          'quantityAvailable': 0,
          'availableUnitAmountsMinor': <int>[],
        },
      ],
    });

void main() {
  late MockRefundApi api;

  setUp(() {
    api = MockRefundApi();
    when(() => api.history('o')).thenAnswer((_) async => []);
    when(() => api.eligibility('o')).thenAnswer((_) async => _eligibility());
  });

  Future<void> pumpForm(WidgetTester tester,
      {double textScale = 1, Listenable? refreshSignal}) async {
    await tester.pumpWidget(MaterialApp(
        home: MediaQuery(
            data: MediaQueryData(
                size: const Size(375, 812),
                textScaler: TextScaler.linear(textScale)),
            child: Scaffold(
                body: SingleChildScrollView(
                    child: RefundRequestPanel(
                        orderId: 'o',
                        api: api,
                        refreshSignal: refreshSignal))))));
    await tester.pumpAndSettle();
  }

  Finder tooltip(String message) => find.byTooltip(message);

  testWidgets(
      'has no refresh button; the order page reloads it when it is pulled down',
      (tester) async {
    final signal = ValueNotifier<int>(0);
    addTearDown(signal.dispose);
    await pumpForm(tester, refreshSignal: signal);

    expect(find.byIcon(Icons.refresh), findsNothing);
    expect(find.byTooltip('Refresh refunds'), findsNothing);
    verify(() => api.eligibility('o')).called(1);

    signal.value++;
    await tester.pumpAndSettle();

    verify(() => api.eligibility('o')).called(1);
    verify(() => api.history('o')).called(greaterThanOrEqualTo(1));
  });

  testWidgets(
      'is one card: header with the request-by date, then only items that can still be refunded',
      (tester) async {
    await pumpForm(tester);

    expect(find.text('Select an item'), findsOneWidget);
    expect(find.textContaining('Request by '), findsOneWidget);
    expect(find.text('Hiking Backpack'), findsOneWidget);
    expect(find.text('2 available'), findsOneWidget);
    expect(find.text('Mug'), findsNothing);
    expect(find.text('Your refund'), findsOneWidget);
    expect(find.text('Submit refund request'), findsOneWidget);
    expect(find.text('The seller reviews your request first.'), findsOneWidget);
  });

  testWidgets(
      'keeps the stepper and field labels, with nothing selected at first',
      (tester) async {
    await pumpForm(tester);

    expect(tooltip('Decrease refund quantity for Hiking Backpack'),
        findsOneWidget);
    expect(tooltip('Increase refund quantity for Hiking Backpack'),
        findsOneWidget);
    expect(find.byKey(const ValueKey('refund_quantity_a')), findsOneWidget);
    expect(find.byKey(const ValueKey('refund_description')), findsOneWidget);
    expect(find.text('Not selected'), findsOneWidget);
    final submit = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Submit refund request'));
    expect(submit.onPressed, isNull);
  });

  testWidgets(
      'the stepper shows the refund for the selection and the summary follows',
      (tester) async {
    await pumpForm(tester);

    await tester.tap(tooltip('Increase refund quantity for Hiking Backpack'));
    await tester.pump();

    expect(find.text(r'$86.39 refund'), findsOneWidget);
    expect(find.text('Not selected'), findsNothing);
    expect(find.textContaining('1 item'), findsOneWidget);

    await tester.tap(tooltip('Increase refund quantity for Hiking Backpack'));
    await tester.pump();
    expect(find.text(r'$172.78 refund'), findsOneWidget);
    expect(find.textContaining('2 items'), findsOneWidget);
    expect(
        tester
            .widget<InkWell>(find.descendant(
                of: tooltip('Increase refund quantity for Hiking Backpack'),
                matching: find.byType(InkWell)))
            .onTap,
        isNull);
  });

  testWidgets(
      'says shipping is included when every item is selected for a seller-fault reason',
      (tester) async {
    await pumpForm(tester);

    await tester.tap(tooltip('Increase refund quantity for Hiking Backpack'));
    await tester.pump();
    await tester.tap(tooltip('Increase refund quantity for Hiking Backpack'));
    await tester.pump();

    expect(find.text(r'Shipping ($13.99) is included in your refund.'),
        findsOneWidget);
  });

  testWidgets(
      'explains why shipping is not refunded yet when only some items are selected',
      (tester) async {
    await pumpForm(tester);

    await tester.tap(tooltip('Increase refund quantity for Hiking Backpack'));
    await tester.pump();

    expect(find.textContaining('is refunded only when you select every item'),
        findsOneWidget);
    expect(find.textContaining('is included in your refund'), findsNothing);
  });

  testWidgets('says nothing about shipping when it can never be refunded',
      (tester) async {
    when(() => api.eligibility('o'))
        .thenAnswer((_) async => _eligibility(shipping: 0));
    await pumpForm(tester);

    expect(find.textContaining('Shipping ('), findsNothing);
  });

  testWidgets(
      'submit enables once an item is selected and the problem is described',
      (tester) async {
    await pumpForm(tester);

    await tester.tap(tooltip('Increase refund quantity for Hiking Backpack'));
    await tester.enterText(
        find.byKey(const ValueKey('refund_description')), 'Broken handle');
    await tester.pump();

    final submit = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Submit refund request'));
    expect(submit.onPressed, isNotNull);
  });

  testWidgets('fits a phone at twice the text size without overflowing',
      (tester) async {
    await pumpForm(tester, textScale: 2);
    await tester.tap(tooltip('Increase refund quantity for Hiking Backpack'));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  group('with earlier requests on the order', () {
    RefundRequestData earlier(String state) => RefundRequestData.fromJson({
          'id': 'r1',
          'orderId': 'o',
          'state': state,
          'amountMinor': 8639,
          'currency': 'usd',
          'reasonCode': 'damaged',
          'description': 'Broken',
          'rejectionReason': 'Item was used',
          'decidedAt': '2026-10-19T03:00:00Z',
          'submittedAt': '2026-10-18T14:39:00Z',
          'completedAt': state == 'refunded' ? '2026-10-19T04:00:00Z' : null,
          'units': [
            {
              'lineId': 'a',
              'ordinal': 1,
              'productName': 'Hiking Backpack',
              'merchandiseMinor': 8000,
              'taxMinor': 639
            }
          ],
        });

    testWidgets(
        'a rejected request comes first and the form waits behind a button',
        (tester) async {
      when(() => api.history('o'))
          .thenAnswer((_) async => [earlier('rejected')]);
      await pumpForm(tester);

      expect(find.text('The seller rejected this request.'), findsOneWidget);
      expect(find.text('Select an item'), findsNothing);
      expect(find.text('Submit refund request'), findsNothing);
      expect(find.text('Request a refund again'), findsOneWidget);
      expect(
          tester.getTopLeft(find.text('The seller rejected this request.')).dy <
              tester.getTopLeft(find.text('Request a refund again')).dy,
          isTrue);
    });

    testWidgets('the button shows the request-by date and opens the form',
        (tester) async {
      when(() => api.history('o'))
          .thenAnswer((_) async => [earlier('rejected')]);
      await pumpForm(tester);

      expect(find.textContaining('Request by '), findsOneWidget);
      await tester.tap(find.text('Request a refund again'));
      await tester.pumpAndSettle();

      expect(find.text('Select an item'), findsOneWidget);
      expect(find.text('Submit refund request'), findsOneWidget);
    });

    testWidgets('opening it again closes the form', (tester) async {
      when(() => api.history('o'))
          .thenAnswer((_) async => [earlier('rejected')]);
      await pumpForm(tester);

      await tester.tap(find.text('Request a refund again'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('refund_form_toggle')));
      await tester.pumpAndSettle();

      expect(find.text('Select an item'), findsNothing);
    });

    testWidgets(
        'after an approved or refunded request the button speaks of other items',
        (tester) async {
      when(() => api.history('o'))
          .thenAnswer((_) async => [earlier('refunded')]);
      await pumpForm(tester);

      expect(find.text('Request a refund for other items'), findsOneWidget);
      expect(find.text('Request a refund again'), findsNothing);
      expect(find.text('Select an item'), findsNothing);
    });

    testWidgets(
        'with no earlier request the form is open and there is no button',
        (tester) async {
      await pumpForm(tester);

      expect(find.text('Select an item'), findsOneWidget);
      expect(find.byKey(const ValueKey('refund_form_toggle')), findsNothing);
    });
  });
}
