import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/constants/app_colors.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/refunds/presentation/refund_order_card.dart';
import 'package:toko_mart/features/refunds/presentation/refund_request_panel.dart';
import 'package:toko_mart/shared/widgets/quantity_pill.dart';

class MockRefundApi extends Mock implements RefundApi {}

RefundEligibility _eligibility() => RefundEligibility.fromJson({
      'eligible': true,
      'requestsEnabled': true,
      'currency': 'usd',
      'deadlineAt': '2026-10-25T14:38:00Z',
      'shippingRefundableMinor': 1399,
      'lines': [
        {
          'lineId': 'a',
          'productName': 'Basketball - Official Size',
          'quantityOrdered': 1,
          'quantityAvailable': 1,
          'availableUnitAmountsMinor': [8639],
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

  Future<void> pumpForm(WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
            body: SingleChildScrollView(
                child: RefundRequestPanel(orderId: 'o', api: api)))));
    await tester.pumpAndSettle();
  }

  Future<void> selectOne(WidgetTester tester) async {
    await tester.tap(find
        .byTooltip('Increase refund quantity for Basketball - Official Size'));
    await tester.pump();
  }

  group('refund summary', () {
    testWidgets(
        'amounts sit at the right edge of the card, not beside their labels',
        (tester) async {
      await pumpForm(tester);

      final card = tester.getRect(find.byType(Form));
      for (final value in tester.widgetList<Text>(find.text(r'$0.00'))) {
        final rect = tester.getRect(find.byWidget(value));
        expect(card.right - rect.right, inInclusiveRange(10, 24),
            reason: 'amount ${value.data} should end at the card padding');
      }
      expect(find.text(r'$0.00'), findsNWidgets(3));
    });

    testWidgets(
        'the total puts the label at the left and the amount at the right',
        (tester) async {
      await pumpForm(tester);

      final card = tester.getRect(find.byType(Form));
      final label = tester.getRect(find.text('Refund total'));
      final amount = tester.getRect(find.text(r'$0.00').last);
      expect(label.left - card.left, inInclusiveRange(10, 24));
      expect(card.right - amount.right, inInclusiveRange(10, 24));
      expect(amount.left, greaterThan(label.right));
    });

    testWidgets('the refund total is set in the same type as the order total',
        (tester) async {
      await pumpForm(tester);

      // The order screen's total row: label 15 w800, amount 16 w900.
      final label = tester.widget<Text>(find.text('Refund total')).style!;
      final amount = tester.widget<Text>(find.text(r'$0.00').last).style!;
      expect((label.fontSize, label.fontWeight), (15.0, FontWeight.w800));
      expect((amount.fontSize, amount.fontWeight), (16.0, FontWeight.w900));
    });

    testWidgets('the same layout inside a refund card’s details',
        (tester) async {
      await tester.pumpWidget(MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
              body: SingleChildScrollView(
                  child: RefundOrderCard(
                      request: RefundRequestData.fromJson({
            'id': 'r1',
            'orderId': '6ad4d9ac1234567890abcdef',
            'state': 'refunded',
            'amountMinor': 10038,
            'shippingMinor': 1399,
            'currency': 'usd',
            'reasonCode': 'damaged',
            'description': 'Broken',
            'completedAt': '2026-10-19T04:00:00Z',
            'units': [
              {
                'lineId': 'a',
                'ordinal': 1,
                'productName': 'Basketball',
                'merchandiseMinor': 7999,
                'taxMinor': 640
              }
            ],
          }))))));
      await tester.tap(find.text('Refund details'));
      await tester.pumpAndSettle();

      final card = tester.getRect(find.byKey(const ValueKey('refund-card-r1')));
      final shipping = tester.getRect(find.text(r'$13.99').last);
      expect(card.right - shipping.right, inInclusiveRange(10, 24));
    });
  });

  group('request fields', () {
    testWidgets('each field has its label above it, not floating inside',
        (tester) async {
      await pumpForm(tester);

      final reasonLabel = tester.getRect(find.text('Reason'));
      final reasonValue = tester.getRect(find.text('Damaged item'));
      expect(reasonLabel.bottom, lessThanOrEqualTo(reasonValue.top));
      final whatLabel =
          tester.getRect(find.text('Tell the seller what happened'));
      final hint = tester
          .getRect(find.text('Describe the issue with the item you received.'));
      expect(whatLabel.bottom, lessThanOrEqualTo(hint.top));
    });

    testWidgets(
        'the character count appears once, live, next to the helper line',
        (tester) async {
      await pumpForm(tester);
      expect(find.text('0/1000'), findsOneWidget);

      await tester.enterText(
          find.byKey(const ValueKey('refund_description')), 'Broken handle');
      await tester.pump();

      expect(find.text('13/1000'), findsOneWidget);
      expect(find.text('0/1000'), findsNothing);
      final count = tester.getRect(find.text('13/1000'));
      final helper = tester.getRect(find
          .text('Describe the problem so the seller can review your request.'));
      expect((count.center.dy - helper.center.dy).abs(), lessThan(14));
    });

    testWidgets(
        'the explanation box looks like the review box: filled, borderless, counter below',
        (tester) async {
      await pumpForm(tester);

      final field = tester.widget<TextField>(find.descendant(
          of: find.byKey(const ValueKey('refund_description')),
          matching: find.byType(TextField)));
      final decoration = field.decoration!;
      expect(decoration.filled, isTrue);
      final border = decoration.border as OutlineInputBorder;
      expect(border.borderSide, BorderSide.none);
      expect(decoration.counterStyle, isNotNull);
      expect(decoration.helperText,
          'Describe the problem so the seller can review your request.');
      expect(decoration.hintText,
          'Describe the issue with the item you received.');
    });
  });

  group('submit', () {
    testWidgets('says what is missing instead of a silent grey button',
        (tester) async {
      await pumpForm(tester);
      expect(find.text('Select an item to refund.'), findsOneWidget);

      await selectOne(tester);
      expect(find.text('Select an item to refund.'), findsNothing);
      expect(find.text('Describe the issue to continue.'), findsOneWidget);

      await tester.enterText(
          find.byKey(const ValueKey('refund_description')), 'Broken handle');
      await tester.pump();
      expect(find.text('Describe the issue to continue.'), findsNothing);
      expect(find.text('Select an item to refund.'), findsNothing);
    });

    testWidgets('a disabled button stays recognisably the brand button',
        (tester) async {
      await pumpForm(tester);

      final button = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Submit refund request'));
      expect(button.onPressed, isNull);
      final background =
          button.style?.backgroundColor?.resolve({WidgetState.disabled});
      expect(background, isNotNull);
      expect(background, isNot(Colors.grey.shade300));
      expect(background!.r, closeTo(AppColors.primary.r, 0.02));
      final foreground =
          button.style?.foregroundColor?.resolve({WidgetState.disabled});
      expect(foreground, isNotNull);
    });
  });

  group('uses the same controls as the rest of the app', () {
    testWidgets(
        'the number to refund is the quantity pill from the product page',
        (tester) async {
      await pumpForm(tester);

      expect(tester.widget(find.byKey(const ValueKey('refund_quantity_a'))),
          isA<QuantityPill>());
      // The explanation is the only text field left in the form.
      expect(find.byType(TextFormField), findsOneWidget);
      expect(find.byIcon(Icons.remove), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);
    });

    testWidgets('the pill cannot go above what is available or below zero',
        (tester) async {
      await pumpForm(tester);
      final decrease = find
          .byTooltip('Decrease refund quantity for Basketball - Official Size');
      final increase = find
          .byTooltip('Increase refund quantity for Basketball - Official Size');
      InkWell inkOf(Finder f) => tester.widget<InkWell>(
          find.descendant(of: f, matching: find.byType(InkWell)));

      expect(inkOf(decrease).onTap, isNull);
      await tester.tap(increase);
      await tester.pump();
      expect(inkOf(increase).onTap, isNull);
      expect(inkOf(decrease).onTap, isNotNull);
      expect(find.text('1'), findsOneWidget);
    });

    testWidgets(
        'the reason is a picker that opens a bottom sheet like the category picker',
        (tester) async {
      await pumpForm(tester);

      expect(find.byType(DropdownButtonFormField<String>), findsNothing);
      expect(find.byKey(const ValueKey('refund_reason_field')), findsOneWidget);
      expect(find.text('Damaged item'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('refund_reason_field')));
      await tester.pumpAndSettle();

      expect(find.text('Select a reason'), findsOneWidget);
      for (final label in [
        'Damaged item',
        'Wrong item',
        'Missing items',
        'Not as described',
        'Other'
      ]) {
        expect(find.text(label), findsWidgets, reason: label);
      }
      expect(find.byKey(const ValueKey('option-damaged')), findsOneWidget);
      expect(find.byIcon(Icons.check_circle_rounded), findsOneWidget);
    });

    testWidgets(
        'choosing a reason updates the field and what happens to shipping',
        (tester) async {
      await pumpForm(tester);
      await selectOne(tester);
      expect(find.text(r'Shipping ($13.99) is included in your refund.'),
          findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('refund_reason_field')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('option-other')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('option-other')), findsNothing);
      expect(find.text('Other'), findsOneWidget);
      expect(find.textContaining('is refunded only when you select every item'),
          findsOneWidget);
    });

    testWidgets('the picker does not open while a request is being sent',
        (tester) async {
      when(() => api.submit('o', any())).thenAnswer((_) async {
        await Future<void>.delayed(const Duration(seconds: 5));
        return RefundRequestData.fromJson(
            {'id': 'r', 'state': 'requested', 'units': []});
      });
      await pumpForm(tester);
      await selectOne(tester);
      await tester.enterText(
          find.byKey(const ValueKey('refund_description')), 'Broken');
      await tester.pump();
      await tester.ensureVisible(find.text('Submit refund request'));
      await tester.tap(find.text('Submit refund request'));
      await tester.pump();

      await tester.tap(find.byKey(const ValueKey('refund_reason_field')),
          warnIfMissed: false);
      await tester.pump();

      expect(find.text('Select a reason'), findsNothing);
      await tester.pumpAndSettle(const Duration(seconds: 6));
    });
  });
}
