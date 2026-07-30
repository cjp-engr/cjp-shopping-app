import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_sizes.dart';

/// Branded dialog used throughout the app.
///
/// Usage:
///   final ok = await AppDialog.show(context, ...);
class AppDialog extends StatelessWidget {
  const AppDialog({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.iconBackground,
    required this.title,
    this.body,
    this.bodyWidget,
    this.cancelLabel = 'Cancel',
    required this.confirmLabel,
    this.confirmColor,
    this.onCancel,
    this.onConfirm,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBackground;
  final String title;
  final String? body;
  final Widget? bodyWidget;
  final String cancelLabel;
  final String confirmLabel;
  final Color? confirmColor;
  final VoidCallback? onCancel;
  final VoidCallback? onConfirm;

  /// Show the dialog and return `true` if confirmed, `false`/null otherwise.
  static Future<bool?> show(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required Color iconBackground,
    required String title,
    String? body,
    Widget? bodyWidget,
    String cancelLabel = 'Cancel',
    required String confirmLabel,
    Color? confirmColor,
  }) {
    return showDialog<bool>(
      context: context,
      barrierColor: Colors.black54,
      builder: (dialogContext) => AppDialog(
        icon: icon,
        iconColor: iconColor,
        iconBackground: iconBackground,
        title: title,
        body: body,
        bodyWidget: bodyWidget,
        cancelLabel: cancelLabel,
        confirmLabel: confirmLabel,
        confirmColor: confirmColor,
        onCancel: () => Navigator.of(dialogContext).pop(false),
        onConfirm: () => Navigator.of(dialogContext).pop(true),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E2432) : Colors.white;
    final titleColor = isDark ? Colors.white : AppColors.textPrimary;
    final bodyColor =
        isDark ? const Color(0xFF94A3B8) : AppColors.textSecondary;
    final actionColor = confirmColor ?? AppColors.primary;

    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
      child: Container(
        decoration: BoxDecoration(
          color: surface,
          borderRadius: BorderRadius.circular(AppSizes.radiusXl),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
              blurRadius: 32,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ── Icon header ────────────────────────────────────────────────
            const SizedBox(height: 28),
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: iconBackground,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 30),
            ),
            const SizedBox(height: 16),

            // ── Title ──────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: titleColor,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  height: 1.3,
                ),
              ),
            ),
            const SizedBox(height: 8),

            // ── Body ───────────────────────────────────────────────────────
            if (body != null || bodyWidget != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: bodyWidget ??
                    Text(
                      body!,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: bodyColor,
                        fontSize: 14,
                        height: 1.55,
                      ),
                    ),
              ),
            const SizedBox(height: 24),

            // ── Divider ────────────────────────────────────────────────────
            Divider(
              height: 1,
              thickness: 1,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : AppColors.border,
            ),

            // ── Actions (stacked vertically for clarity) ───────────────────
            _ActionButton(
              label: confirmLabel,
              color: actionColor,
              filled: true,
              onTap: onConfirm,
            ),
            Divider(
              height: 1,
              thickness: 1,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.08)
                  : AppColors.border,
            ),
            _ActionButton(
              label: cancelLabel,
              color: isDark ? const Color(0xFF64748B) : AppColors.textSecondary,
              filled: false,
              onTap: onCancel,
            ),
            const SizedBox(height: AppSizes.xs),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.color,
    required this.filled,
    this.onTap,
  });

  final String label;
  final Color color;
  final bool filled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: TextButton(
        style: TextButton.styleFrom(
          foregroundColor: filled ? Colors.white : color,
          backgroundColor: filled ? color : Colors.transparent,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: const RoundedRectangleBorder(),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ).copyWith(
          overlayColor: WidgetStateProperty.all(
            color.withValues(alpha: 0.1),
          ),
        ),
        onPressed: onTap,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: filled ? FontWeight.w600 : FontWeight.w500,
            color: filled ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}

/// A dialog variant for forms (e.g. cancel with reason textarea).
/// Wraps AppDialog layout but with a scrollable body area.
class AppFormDialog extends StatelessWidget {
  const AppFormDialog({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.iconBackground,
    required this.title,
    this.subtitle,
    required this.formContent,
    this.cancelLabel = 'Cancel',
    required this.confirmLabel,
    this.confirmColor,
    this.onCancel,
    this.onConfirm,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBackground;
  final String title;
  final String? subtitle;
  final Widget formContent;
  final String cancelLabel;
  final String confirmLabel;
  final Color? confirmColor;
  final VoidCallback? onCancel;
  final VoidCallback? onConfirm;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E2432) : Colors.white;
    final titleColor = isDark ? Colors.white : AppColors.textPrimary;
    final bodyColor =
        isDark ? const Color(0xFF94A3B8) : AppColors.textSecondary;
    final actionColor = confirmColor ?? AppColors.primary;

    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      child: Container(
        decoration: BoxDecoration(
          color: surface,
          borderRadius: BorderRadius.circular(AppSizes.radiusXl),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
              blurRadius: 32,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 28),
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: iconBackground,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 30),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: titleColor,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  height: 1.3,
                ),
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  subtitle!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: bodyColor, fontSize: 13, height: 1.5),
                ),
              ),
            ],
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: formContent,
            ),
            const SizedBox(height: 20),
            Divider(
                height: 1,
                thickness: 1,
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : AppColors.border),
            _ActionButton(
              label: confirmLabel,
              color: actionColor,
              filled: true,
              onTap: onConfirm,
            ),
            Divider(
                height: 1,
                thickness: 1,
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : AppColors.border),
            _ActionButton(
              label: cancelLabel,
              color: isDark ? const Color(0xFF64748B) : AppColors.textSecondary,
              filled: false,
              onTap: onCancel,
            ),
            const SizedBox(height: AppSizes.xs),
          ],
        ),
      ),
    );
  }
}
