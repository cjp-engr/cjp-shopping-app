import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../domain/refund_mark.dart';

/// "Refunded" (or how much of the item was, or "Refund processing") on an order item whose units
/// were paid back. Nothing is drawn when [mark] is null.
class RefundItemBadge extends StatelessWidget {
  final RefundMark? mark;
  const RefundItemBadge({super.key, required this.mark});

  @override
  Widget build(BuildContext context) {
    final m = mark;
    if (m == null) return const SizedBox.shrink();
    final color = m.done ? AppColors.success : AppColors.warning;
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: color.withAlpha(30),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.assignment_return_outlined, size: 12, color: color),
          const SizedBox(width: 4),
          Flexible(
              child: Text(m.label,
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: color))),
        ]),
      ),
    );
  }
}
