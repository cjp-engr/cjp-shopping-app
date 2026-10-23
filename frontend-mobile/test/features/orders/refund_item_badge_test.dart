import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/orders/domain/refund_mark.dart';
import 'package:toko_mart/features/orders/presentation/widgets/refund_item_badge.dart';

Widget _wrap(Widget child, {bool dark = false}) => MaterialApp(
    theme: dark ? AppTheme.dark : AppTheme.light,
    home: Scaffold(body: Center(child: child)));

Color? _textColor(WidgetTester tester, String label) =>
    tester.widget<Text>(find.text(label)).style?.color;

BoxDecoration _decoration(WidgetTester tester) => tester
    .widget<Container>(find.descendant(
        of: find.byType(RefundItemBadge), matching: find.byType(Container)))
    .decoration! as BoxDecoration;

const _full = RefundMark('Refunded', RefundKind.full);
const _partial = RefundMark('2 of 4 refunded', RefundKind.partial);
const _processing = RefundMark('Refund processing', RefundKind.processing);

void main() {
  group('light', () {
    testWidgets('full: a violet tint with a check, no outline', (tester) async {
      await tester.pumpWidget(_wrap(const RefundItemBadge(mark: _full)));

      expect(_textColor(tester, 'Refunded'), const Color(0xFF5B21B6));
      expect(_decoration(tester).color, const Color(0xFFEDE9FE));
      expect(_decoration(tester).border, isNull);
      expect(find.byIcon(Icons.check_circle_outline_rounded), findsOneWidget);
    });

    testWidgets('partial: a violet outline with a half circle', (tester) async {
      await tester.pumpWidget(_wrap(const RefundItemBadge(mark: _partial)));

      expect(_textColor(tester, '2 of 4 refunded'), const Color(0xFF6D28D9));
      expect(_decoration(tester).color, const Color(0xFFF5F3FF));
      expect((_decoration(tester).border! as Border).top.color,
          const Color(0xFFC4B5FD));
      expect(find.byIcon(Icons.contrast), findsOneWidget);
    });

    testWidgets('processing: amber with a clock', (tester) async {
      await tester.pumpWidget(_wrap(const RefundItemBadge(mark: _processing)));

      expect(_textColor(tester, 'Refund processing'), const Color(0xFF92400E));
      expect(_decoration(tester).color, const Color(0xFFFEF3C7));
      expect(find.byIcon(Icons.schedule), findsOneWidget);
    });
  });

  group('dark', () {
    testWidgets('full and partial are violet text on a violet tint',
        (tester) async {
      await tester
          .pumpWidget(_wrap(const RefundItemBadge(mark: _full), dark: true));
      expect(_textColor(tester, 'Refunded'), const Color(0xFFDDD6FE));
      expect(_decoration(tester).color, const Color(0xFF8B5CF6).withAlpha(56));

      await tester
          .pumpWidget(_wrap(const RefundItemBadge(mark: _partial), dark: true));
      expect(_textColor(tester, '2 of 4 refunded'), const Color(0xFFC4B5FD));
      expect(_decoration(tester).color, const Color(0xFF8B5CF6).withAlpha(26));
      expect((_decoration(tester).border! as Border).top.color,
          const Color(0xFF8B5CF6).withAlpha(140));
    });

    testWidgets('processing is amber text on an amber tint', (tester) async {
      await tester.pumpWidget(
          _wrap(const RefundItemBadge(mark: _processing), dark: true));

      expect(_textColor(tester, 'Refund processing'), const Color(0xFFFCD34D));
      expect(_decoration(tester).color, const Color(0xFFF59E0B).withAlpha(51));
    });
  });

  testWidgets('shows nothing without a mark', (tester) async {
    await tester.pumpWidget(_wrap(const RefundItemBadge(mark: null)));

    expect(find.byType(Text), findsNothing);
    expect(find.byType(Icon), findsNothing);
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
                        mark: RefundMark('1 refunded, 1 processing',
                            RefundKind.processing)))))));

    expect(tester.takeException(), isNull);
  });
}
