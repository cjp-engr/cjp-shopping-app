import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/shared/widgets/quantity_pill.dart';

Widget _pill({
  int value = 1,
  int min = 0,
  int max = 3,
  ValueChanged<int>? onChanged,
}) =>
    MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
            body: Center(
                child: QuantityPill(
                    value: value,
                    min: min,
                    max: max,
                    decreaseTooltip: 'Decrease thing',
                    increaseTooltip: 'Increase thing',
                    semanticLabel: 'Thing quantity',
                    onChanged: onChanged))));

InkWell _button(WidgetTester tester, String tooltip) =>
    tester.widget<InkWell>(find.descendant(
        of: find.byTooltip(tooltip), matching: find.byType(InkWell)));

void main() {
  testWidgets('shows the value between a minus and a plus', (tester) async {
    await tester.pumpWidget(_pill(value: 2));

    expect(find.text('2'), findsOneWidget);
    expect(find.byIcon(Icons.remove), findsOneWidget);
    expect(find.byIcon(Icons.add), findsOneWidget);
  });

  testWidgets(
      'is a fully rounded pill on the surface colour, like the product quantity',
      (tester) async {
    await tester.pumpWidget(_pill());

    final box = tester.widget<Container>(find.descendant(
        of: find.byType(QuantityPill),
        matching: find.byWidgetPredicate((w) =>
            w is Container &&
            w.decoration is BoxDecoration &&
            (w.decoration as BoxDecoration).border != null)));
    final decoration = box.decoration! as BoxDecoration;
    expect(decoration.borderRadius, BorderRadius.circular(999));
    expect(decoration.color, isNotNull);
  });

  testWidgets('plus and minus change the value by one and report it',
      (tester) async {
    final seen = <int>[];
    await tester.pumpWidget(_pill(value: 1, onChanged: seen.add));

    await tester.tap(find.byTooltip('Increase thing'));
    await tester.tap(find.byTooltip('Decrease thing'));

    expect(seen, [2, 0]);
  });

  testWidgets('minus is disabled at the minimum and plus at the maximum',
      (tester) async {
    await tester.pumpWidget(_pill(value: 0, onChanged: (_) {}));
    expect(_button(tester, 'Decrease thing').onTap, isNull);
    expect(_button(tester, 'Increase thing').onTap, isNotNull);

    await tester.pumpWidget(_pill(value: 3, onChanged: (_) {}));
    expect(_button(tester, 'Increase thing').onTap, isNull);
    expect(_button(tester, 'Decrease thing').onTap, isNotNull);
  });

  testWidgets('does nothing when it has no handler (locked)', (tester) async {
    await tester.pumpWidget(_pill(value: 1));

    expect(_button(tester, 'Increase thing').onTap, isNull);
    expect(_button(tester, 'Decrease thing').onTap, isNull);
  });

  testWidgets('each button is at least 44 by 44 to tap', (tester) async {
    await tester.pumpWidget(_pill(onChanged: (_) {}));

    for (final tooltip in ['Decrease thing', 'Increase thing']) {
      final size = tester.getSize(find.byTooltip(tooltip));
      expect(size.width, greaterThanOrEqualTo(44), reason: tooltip);
      expect(size.height, greaterThanOrEqualTo(44), reason: tooltip);
    }
  });

  testWidgets('tells a screen reader what the number is for', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(_pill(value: 2));

    expect(tester.getSemantics(find.text('2')),
        matchesSemantics(label: 'Thing quantity', value: '2'));
    handle.dispose();
  });
}
