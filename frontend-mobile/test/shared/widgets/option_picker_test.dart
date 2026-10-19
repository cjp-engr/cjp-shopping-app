import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/shared/widgets/option_picker.dart';

const _options = [
  PickerOption<String>('electronics', 'Electronics', Icons.devices_other),
  PickerOption<String>('clothing', 'Clothing', Icons.checkroom_outlined),
  PickerOption<String>('books', 'Books', Icons.menu_book_outlined),
];

Widget _field({
  String? value,
  ValueChanged<String>? onChanged,
  bool enabled = true,
}) =>
    MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
            body: Padding(
                padding: const EdgeInsets.all(16),
                child: OptionPickerField<String>(
                    key: const ValueKey('picker'),
                    title: 'Select a category',
                    placeholder: 'Select a category',
                    placeholderIcon: Icons.category_outlined,
                    options: _options,
                    value: value,
                    enabled: enabled,
                    onChanged: onChanged ?? (_) {}))));

void main() {
  testWidgets(
      'shows the placeholder with its icon and a chevron until something is chosen',
      (tester) async {
    await tester.pumpWidget(_field());

    expect(find.text('Select a category'), findsOneWidget);
    expect(find.byIcon(Icons.category_outlined), findsOneWidget);
    expect(find.byIcon(Icons.keyboard_arrow_down_rounded), findsOneWidget);
  });

  testWidgets('shows the chosen option with its own icon', (tester) async {
    await tester.pumpWidget(_field(value: 'clothing'));

    expect(find.text('Clothing'), findsOneWidget);
    expect(find.text('Select a category'), findsNothing);
    expect(find.byIcon(Icons.checkroom_outlined), findsOneWidget);
    expect(find.byIcon(Icons.category_outlined), findsNothing);
  });

  testWidgets('opens a bottom sheet with a handle, a title and every option',
      (tester) async {
    await tester.pumpWidget(_field());

    await tester.tap(find.byKey(const ValueKey('picker')));
    await tester.pumpAndSettle();

    // The title appears in the field and again as the sheet heading.
    expect(find.text('Select a category'), findsNWidgets(2));
    for (final option in _options) {
      expect(find.byKey(ValueKey('option-${option.value}')), findsOneWidget);
      expect(find.text(option.label), findsOneWidget);
      expect(find.byIcon(option.icon), findsOneWidget);
    }
    expect(find.byKey(const ValueKey('option-sheet-handle')), findsOneWidget);
  });

  testWidgets('marks the current choice with a check and highlights it',
      (tester) async {
    await tester.pumpWidget(_field(value: 'books'));
    await tester.tap(find.byKey(const ValueKey('picker')));
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.check_circle_rounded), findsOneWidget);
    final checked = find.descendant(
        of: find.byKey(const ValueKey('option-books')),
        matching: find.byIcon(Icons.check_circle_rounded));
    expect(checked, findsOneWidget);
  });

  testWidgets('choosing an option reports it and closes the sheet',
      (tester) async {
    String? chosen;
    await tester.pumpWidget(_field(onChanged: (v) => chosen = v));
    await tester.tap(find.byKey(const ValueKey('picker')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('option-clothing')));
    await tester.pumpAndSettle();

    expect(chosen, 'clothing');
    expect(find.byKey(const ValueKey('option-sheet-handle')), findsNothing);
  });

  testWidgets('does not open when disabled', (tester) async {
    await tester.pumpWidget(_field(enabled: false));

    await tester.tap(find.byKey(const ValueKey('picker')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('option-sheet-handle')), findsNothing);
  });

  testWidgets(
      'each option row has a 40 by 40 icon square like the category list',
      (tester) async {
    await tester.pumpWidget(_field());
    await tester.tap(find.byKey(const ValueKey('picker')));
    await tester.pumpAndSettle();

    final square = find.ancestor(
        of: find.byIcon(Icons.menu_book_outlined),
        matching: find.byWidgetPredicate(
            (w) => w is Container && w.constraints?.maxWidth == 40));
    expect(square, findsOneWidget);
  });

  testWidgets('works at twice the text size', (tester) async {
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(2)),
            child: Scaffold(
                body: OptionPickerField<String>(
                    title: 'Select a category',
                    placeholder: 'Select a category',
                    placeholderIcon: Icons.category_outlined,
                    options: _options,
                    value: 'electronics',
                    onChanged: (_) {})))));
    await tester.tap(find.byType(OptionPickerField<String>));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });
}
