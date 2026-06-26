import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

Color orderStatusColor(String status) {
  switch (status) {
    case 'pending':    return AppColors.warning;
    case 'processing': return AppColors.primary;
    case 'shipped':    return AppColors.primaryLight;
    case 'delivered':  return AppColors.success;
    case 'cancelled':  return AppColors.danger;
    default:           return AppColors.textMuted;
  }
}

IconData orderStatusIcon(String status) {
  switch (status) {
    case 'pending':    return Icons.access_time_rounded;
    case 'processing': return Icons.inventory_2_outlined;
    case 'shipped':    return Icons.local_shipping_outlined;
    case 'delivered':  return Icons.check_circle_outline_rounded;
    case 'cancelled':  return Icons.cancel_outlined;
    default:           return Icons.help_outline;
  }
}

int orderStatusStep(String status) {
  switch (status) {
    case 'pending':    return 0;
    case 'processing': return 1;
    case 'shipped':    return 2;
    case 'delivered':  return 3;
    default:           return -1;
  }
}

String formatOrderDate(String? raw) {
  if (raw == null || raw.isEmpty) return '';
  try {
    final dt = DateTime.parse(raw).toLocal();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  } catch (_) {
    return raw;
  }
}

/// Groups order items by seller key (sellerId ?? '__unknown__').
Map<String, List<T>> groupItemsBySeller<T>(
  List<T> items,
  String? Function(T) getSellerId,
) {
  final groups = <String, List<T>>{};
  for (final item in items) {
    final key = getSellerId(item) ?? '__unknown__';
    groups.putIfAbsent(key, () => []).add(item);
  }
  return groups;
}
