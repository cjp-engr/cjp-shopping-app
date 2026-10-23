import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/constants/app_colors.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/orders/domain/refund_mark.dart';
import 'package:toko_mart/features/orders/presentation/widgets/refund_item_badge.dart';

Widget _wrap(Widget child) => MaterialApp(
    theme: AppTheme.light, home: Scaffold(body: Center(child: child)));

void main() {
  testWidgets('shows the Refunded mark with the success colour',
      (tester) async {
    await tester.pumpWidget(
        _wrap(const RefundItemBadge(mark: RefundMark('Refunded', true))));

    expect(find.text('Refunded'), findsOneWidget);
    final text = tester.widget<Text>(find.text('Refunded'));
    expect(text.style?.color, AppColors.success);
    expect(find.byIcon(Icons.assignment_return_outlined), findsOneWidget);
  });

  testWidgets('shows a processing refund in the warning colour',
      (tester) async {
    await tester.pumpWidget(_wrap(
        const RefundItemBadge(mark: RefundMark('Refund processing', false))));

    expect(find.text('Refund processing'), findsOneWidget);
    expect(tester.widget<Text>(find.text('Refund processing')).style?.color,
        isNot(AppColors.success));
  });

  testWidgets('shows nothing without a mark', (tester) async {
    await tester.pumpWidget(_wrap(const RefundItemBadge(mark: null)));

    expect(find.byType(Text), findsNothing);
    expect(find.byIcon(Icons.assignment_return_outlined), findsNothing);
  });

  testWidgets('wraps its label instead of overflowing at large text',
      (tester) async {
    tester.view.physicalSize = const Size(200, 400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: const MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(2)),
            child: Scaffold(
                body: SizedBox(
                    width: 160,
                    child: RefundItemBadge(
                        mark:
                            RefundMark('1 refunded, 1 processing', false)))))));

    expect(tester.takeException(), isNull);
  });
}
