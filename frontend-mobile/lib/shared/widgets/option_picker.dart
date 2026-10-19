import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_sizes.dart';
import '../../core/theme/theme_colors.dart';

class PickerOption<T> {
  final T value;
  final String label;
  final IconData icon;
  const PickerOption(this.value, this.label, this.icon);
}

/// A tappable field that opens a bottom sheet of choices, styled like the category picker in the
/// product form: an icon, the choice (or a placeholder) and a chevron; the sheet has a handle, a
/// title and rows with a square icon, the label, and a check on the current choice.
class OptionPickerField<T> extends StatelessWidget {
  final String title, placeholder;
  final IconData placeholderIcon;
  final List<PickerOption<T>> options;
  final T? value;
  final bool enabled;
  final ValueChanged<T> onChanged;

  const OptionPickerField({
    super.key,
    required this.title,
    required this.placeholder,
    required this.placeholderIcon,
    required this.options,
    required this.onChanged,
    this.value,
    this.enabled = true,
  });

  PickerOption<T>? get _selected {
    for (final option in options) {
      if (option.value == value) return option;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selected;
    return Semantics(
      button: true,
      enabled: enabled,
      child: GestureDetector(
        onTap: enabled ? () => _open(context) : null,
        child: Opacity(
          opacity: enabled ? 1 : 0.6,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            decoration: BoxDecoration(
              border: Border.all(color: context.borderColor),
              borderRadius: BorderRadius.circular(AppSizes.radiusMd),
            ),
            child: Row(children: [
              Icon(selected?.icon ?? placeholderIcon,
                  size: 20,
                  color: selected != null
                      ? AppColors.primary
                      : context.onSurfaceMuted),
              const SizedBox(width: 12),
              Expanded(
                  child: Text(selected?.label ?? placeholder,
                      style: TextStyle(
                          fontSize: 14,
                          color: selected != null
                              ? context.onSurfaceColor
                              : context.onSurfaceMuted))),
              Icon(Icons.keyboard_arrow_down_rounded,
                  size: 22, color: context.onSurfaceMuted),
            ]),
          ),
        ),
      ),
    );
  }

  void _open(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              key: const ValueKey('option-sheet-handle'),
              width: 36,
              height: 4,
              margin:
                  const EdgeInsets.only(top: AppSizes.sm, bottom: AppSizes.xs),
              decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSizes.md, AppSizes.xs, AppSizes.md, AppSizes.sm),
              child: Text(title,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: sheetContext.onSurfaceColor)),
            ),
            for (final option in options) _row(sheetContext, option),
            const SizedBox(height: AppSizes.sm),
          ]),
        ),
      ),
    );
  }

  Widget _row(BuildContext sheetContext, PickerOption<T> option) {
    final isSelected = option.value == value;
    return ListTile(
      key: ValueKey('option-${option.value}'),
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withAlpha(20)
              : sheetContext.surfaceVariantColor,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(option.icon,
            size: 20,
            color:
                isSelected ? AppColors.primary : sheetContext.onSurfaceMuted),
      ),
      title: Text(option.label,
          style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isSelected
                  ? AppColors.primary
                  : sheetContext.onSurfaceColor)),
      trailing: isSelected
          ? const Icon(Icons.check_circle_rounded,
              color: AppColors.primary, size: 20)
          : null,
      onTap: () {
        Navigator.pop(sheetContext);
        onChanged(option.value);
      },
    );
  }
}
