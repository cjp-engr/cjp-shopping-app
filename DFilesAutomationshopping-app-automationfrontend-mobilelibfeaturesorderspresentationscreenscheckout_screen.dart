
// ── Payment option radio button ────────────────────────────────────────────

class _PaymentOption extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;
  final String groupValue;
  final ValueChanged<String?> onChanged;

  const _PaymentOption({
    required this.value,
    required this.label,
    required this.icon,
    required this.groupValue,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSelected = value == groupValue;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => onChanged(value),
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(AppSizes.md),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary.withValues(alpha: 0.1)
                : Colors.transparent,
            border: Border.all(
              color: isSelected
                  ? AppColors.primary
                  : (isDark ? Colors.white10 : Colors.grey[300]!),
              width: 1.5,
            ),
            borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          ),
          child: Row(
            children: [
              Radio<String>(
                value: value,
                groupValue: groupValue,
                onChanged: onChanged,
                activeColor: AppColors.primary,
              ),
              const SizedBox(width: 12),
              Icon(icon, size: 20, color: context.onSurfaceColor),
              const SizedBox(width: 12),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
