import 'package:flutter/material.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../domain/refund_mark.dart';

/// The chip for a refund, on an order or on one of its items: a violet tint with a check for a full
/// refund, a violet outline with a half circle for a partial one, amber with a clock while it is still
/// being paid back. Nothing is drawn when [mark] is null.
class RefundItemBadge extends StatelessWidget {
  final RefundMark? mark;

  /// Space above the chip; 0 where it sits in a row of its own height, such as a card header.
  final double topPadding;
  const RefundItemBadge({super.key, required this.mark, this.topPadding = 4});

  static const _violet = Color(0xFF8B5CF6);
  static const _amber = Color(0xFFF59E0B);

  @override
  Widget build(BuildContext context) {
    final m = mark;
    if (m == null) return const SizedBox.shrink();
    final dark = context.isDark;
    final (bg, fg, border, icon) = switch (m.kind) {
      RefundKind.full => (
          dark ? _violet.withAlpha(56) : const Color(0xFFEDE9FE),
          dark ? const Color(0xFFDDD6FE) : const Color(0xFF5B21B6),
          null,
          Icons.check_circle_outline_rounded,
        ),
      RefundKind.partial => (
          dark ? _violet.withAlpha(26) : const Color(0xFFF5F3FF),
          dark ? const Color(0xFFC4B5FD) : const Color(0xFF6D28D9),
          dark ? _violet.withAlpha(140) : const Color(0xFFC4B5FD),
          Icons.contrast,
        ),
      RefundKind.processing => (
          dark ? _amber.withAlpha(51) : const Color(0xFFFEF3C7),
          dark ? const Color(0xFFFCD34D) : const Color(0xFF92400E),
          null,
          Icons.schedule,
        ),
    };
    return Padding(
      padding: EdgeInsets.only(top: topPadding),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
          border: border == null ? null : Border.all(color: border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Flexible(
              child: Text(m.label,
                  style: TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w700, color: fg))),
        ]),
      ),
    );
  }
}
