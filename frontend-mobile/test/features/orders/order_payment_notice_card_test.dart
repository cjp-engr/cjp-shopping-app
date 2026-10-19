import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/core/utils/order_payment_notice.dart';
import 'package:toko_mart/features/orders/presentation/screens/order_payment_notice_card.dart';

Widget _card(OrderPaymentNotice notice,
        {String? deadline,
        String? note,
        ThemeData? theme,
        double width = 375}) =>
    MaterialApp(
        theme: theme ?? AppTheme.light,
        home: Scaffold(
            body: Center(
                child: SizedBox(
                    width: width,
                    child: OrderPaymentNoticeCard(
                        notice: notice,
                        deadlineText: deadline,
                        shortWindowNote: note)))));

const _reserved = OrderPaymentNotice(
    tone: OrderPaymentTone.info,
    title: 'Payment reserved',
    body:
        'Your payment is reserved. It is charged when the seller starts preparing your order.');

void main() {
  testWidgets('shows the title and body with the icon in its own round badge',
      (tester) async {
    await tester.pumpWidget(_card(_reserved));

    expect(find.text('Payment reserved'), findsOneWidget);
    expect(find.textContaining('It is charged when the seller starts'),
        findsOneWidget);
    expect(find.byIcon(Icons.lock_clock_outlined), findsOneWidget);
    final badge = find.ancestor(
        of: find.byIcon(Icons.lock_clock_outlined),
        matching: find.byWidgetPredicate((w) =>
            w is Container &&
            w.decoration is BoxDecoration &&
            (w.decoration as BoxDecoration).shape == BoxShape.circle));
    expect(badge, findsOneWidget);
  });

  testWidgets('puts the acceptance deadline in its own pill with a clock',
      (tester) async {
    await tester.pumpWidget(_card(_reserved,
        deadline: 'The seller has until Oct 20, 10:16 PM to accept'));

    final text = find.byKey(const Key('order-acceptance-deadline'));
    expect(text, findsOneWidget);
    expect(find.byIcon(Icons.schedule), findsOneWidget);
    final pill = find.ancestor(
        of: text,
        matching: find.byWidgetPredicate((w) =>
            w is Container &&
            w.decoration is BoxDecoration &&
            (w.decoration as BoxDecoration).borderRadius != null));
    expect(pill, findsWidgets);
  });

  testWidgets('keeps the short authorization note below', (tester) async {
    await tester.pumpWidget(_card(_reserved,
        deadline: 'The seller has until Oct 20, 10:16 PM to accept',
        note: 'Your bank hold is short, so the window is shorter.'));

    expect(find.byKey(const Key('order-short-authorization-note')),
        findsOneWidget);
    expect(find.textContaining('window is shorter'), findsOneWidget);
  });

  testWidgets(
      'is the same card for every tone, with no deadline when there is none',
      (tester) async {
    for (final tone in OrderPaymentTone.values) {
      await tester.pumpWidget(_card(
          OrderPaymentNotice(tone: tone, title: 'Title $tone', body: 'Body'),
          theme: AppTheme.dark));
      expect(find.text('Title $tone'), findsOneWidget);
      expect(find.byKey(const Key('order-acceptance-deadline')), findsNothing);
    }
  });

  testWidgets('fits a narrow screen at twice the text size', (tester) async {
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: const MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(2)),
            child: Scaffold(
                body: SizedBox(
                    width: 320,
                    child: SingleChildScrollView(
                        child: OrderPaymentNoticeCard(
                            notice: _reserved,
                            deadlineText:
                                'The seller has until Oct 20, 10:16 PM to accept')))))));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });
}
