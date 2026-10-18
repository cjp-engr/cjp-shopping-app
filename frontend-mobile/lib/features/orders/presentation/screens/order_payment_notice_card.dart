import 'package:flutter/material.dart';
import 'package:toko_mart/keys.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/utils/order_payment_notice.dart';

/// Foreground and background for a notice tone, taken from the active color scheme
/// so it stays readable in light and dark themes.
({Color background, Color foreground, IconData icon}) _toneStyle(
  ColorScheme scheme,
  OrderPaymentTone tone,
) {
  switch (tone) {
    case OrderPaymentTone.info:
      return (
        background: scheme.primaryContainer,
        foreground: scheme.onPrimaryContainer,
        icon: Icons.lock_clock_outlined,
      );
    case OrderPaymentTone.success:
      return (
        background: scheme.tertiaryContainer,
        foreground: scheme.onTertiaryContainer,
        icon: Icons.check_circle_outline_rounded,
      );
    case OrderPaymentTone.neutral:
      return (
        background: scheme.secondaryContainer,
        foreground: scheme.onSecondaryContainer,
        icon: Icons.info_outline_rounded,
      );
    case OrderPaymentTone.warning:
      return (
        background: scheme.errorContainer,
        foreground: scheme.onErrorContainer,
        icon: Icons.warning_amber_rounded,
      );
  }
}

/// Buyer payment notice: title, body and an icon chosen by tone. The optional
/// [deadlineText] and [shortWindowNote] are the seller acceptance lines.
class OrderPaymentNoticeCard extends StatelessWidget {
  final OrderPaymentNotice notice;
  final String? deadlineText;
  final String? shortWindowNote;

  const OrderPaymentNoticeCard({
    super.key = const Key('order-payment-notice'),
    required this.notice,
    this.deadlineText,
    this.shortWindowNote,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = _toneStyle(theme.colorScheme, notice.tone);
    final textTheme = theme.textTheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSizes.md),
      decoration: BoxDecoration(
        color: style.background,
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(style.icon, size: 20, color: style.foreground),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  key: keys.orders.paymentNoticeTitle(notice.title),
                  notice.title,
                  style: textTheme.bodyMedium?.copyWith(
                    color: style.foreground,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  notice.body,
                  style: textTheme.bodySmall?.copyWith(
                    color: style.foreground,
                    height: 1.4,
                  ),
                ),
                if (deadlineText != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    deadlineText!,
                    key: const Key('order-acceptance-deadline'),
                    style: textTheme.bodySmall?.copyWith(
                      color: style.foreground,
                      fontWeight: FontWeight.w600,
                      height: 1.4,
                    ),
                  ),
                ],
                if (shortWindowNote != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    shortWindowNote!,
                    key: const Key('order-short-authorization-note'),
                    style: textTheme.bodySmall?.copyWith(
                      color: style.foreground,
                      height: 1.4,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Compact one-line payment status label for the orders list.
class OrderPaymentNoticeLabel extends StatelessWidget {
  final OrderPaymentNotice notice;

  const OrderPaymentNoticeLabel({super.key, required this.notice});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = _toneStyle(theme.colorScheme, notice.tone);

    return Row(
      key: const Key('order-payment-notice-label'),
      children: [
        Icon(style.icon, size: 14, color: theme.colorScheme.onSurface),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            notice.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
