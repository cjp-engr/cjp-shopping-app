import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_sizes.dart';
import '../../core/theme/theme_colors.dart';

/// The "- 1 +" pill used to pick a number of items, styled like the quantity on a product page:
/// a fully rounded pill on the surface colour with 44px tap targets.
///
/// With no [onChanged] it is locked (both buttons off).
class QuantityPill extends StatelessWidget {
  final int value, min, max;
  final String decreaseTooltip, increaseTooltip, semanticLabel;
  final ValueChanged<int>? onChanged;

  const QuantityPill({
    super.key,
    required this.value,
    required this.min,
    required this.max,
    required this.decreaseTooltip,
    required this.increaseTooltip,
    required this.semanticLabel,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final change = onChanged;
    return Container(
      decoration: BoxDecoration(
        color: context.surfaceVariantColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusFull),
        border: Border.all(color: context.borderColor),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        _PillButton(
          icon: Icons.remove,
          tooltip: decreaseTooltip,
          onTap:
              change == null || value <= min ? null : () => change(value - 1),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Semantics(
            label: semanticLabel,
            value: '$value',
            excludeSemantics: true,
            child: Text('$value',
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ),
        _PillButton(
          icon: Icons.add,
          tooltip: increaseTooltip,
          onTap:
              change == null || value >= max ? null : () => change(value + 1),
        ),
      ]),
    );
  }
}

class _PillButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onTap;
  const _PillButton({required this.icon, required this.tooltip, this.onTap});

  @override
  Widget build(BuildContext context) => Tooltip(
        message: tooltip,
        child: Semantics(
          button: true,
          enabled: onTap != null,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(AppSizes.radiusFull),
            child: SizedBox(
              width: 44,
              height: 44,
              child: Icon(icon,
                  size: 18,
                  color: onTap == null
                      ? AppColors.textMuted
                      : context.onSurfaceColor),
            ),
          ),
        ),
      );
}
