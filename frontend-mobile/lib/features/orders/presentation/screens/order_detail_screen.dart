import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/order_bloc.dart';
import '../bloc/order_event.dart';
import '../bloc/order_state.dart';
import '../../domain/entities/order_entity.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/seller_avatar.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

String _formatDate(String? raw) {
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

Color _statusColor(String status) {
  switch (status) {
    case 'pending':    return AppColors.warning;
    case 'processing': return AppColors.primary;
    case 'shipped':    return AppColors.primaryLight;
    case 'delivered':  return AppColors.success;
    case 'cancelled':  return AppColors.danger;
    default:           return AppColors.textMuted;
  }
}

IconData _statusIcon(String status) {
  switch (status) {
    case 'pending':    return Icons.access_time_rounded;
    case 'processing': return Icons.inventory_2_outlined;
    case 'shipped':    return Icons.local_shipping_outlined;
    case 'delivered':  return Icons.check_circle_outline_rounded;
    case 'cancelled':  return Icons.cancel_outlined;
    default:           return Icons.help_outline;
  }
}

int _statusStep(String status) {
  switch (status) {
    case 'pending':    return 0;
    case 'processing': return 1;
    case 'shipped':    return 2;
    case 'delivered':  return 3;
    default:           return -1;
  }
}

class OrderDetailScreen extends StatelessWidget {
  final String orderId;
  final String? sellerKey;
  const OrderDetailScreen({super.key, required this.orderId, this.sellerKey});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrderBloc, OrderState>(
      builder: (context, state) {
        if (state.status == OrderStatus.loading && state.orders.isEmpty) {
          return const Scaffold(body: LoadingWidget());
        }

        OrderEntity? order;
        try {
          order = state.orders.firstWhere((o) => o.id == orderId);
        } catch (_) {
          order = null;
        }

        if (order == null) {
          return Scaffold(
            appBar: AppBar(
              title: const Text('Order Details'),
            ),
            body: const Center(
              child: Text(
                'Order not found',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ),
          );
        }

        return _OrderDetailView(order: order, sellerKey: sellerKey);
      },
    );
  }
}

class _OrderDetailView extends StatelessWidget {
  final OrderEntity order;
  final String? sellerKey;
  const _OrderDetailView({required this.order, this.sellerKey});

  Future<void> _showCancelDialog(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Cancel Order'),
        content: Text(
            'Cancel order #${order.shortId}?\nThis action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: const Text('Keep Order'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
    if (confirm == true && context.mounted) {
      final user = context.read<AuthBloc>().state.user;
      if (user != null) {
        context
            .read<OrderBloc>()
            .add(OrderCancelRequested(order.id, user.id));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(order.status);
    final icon = _statusIcon(order.status);
    final stepIndex = _statusStep(order.status);
    final isCancelled = order.status == 'cancelled';
    final dateStr = _formatDate(order.createdAt);
    final deliveryStr = _formatDate(order.estimatedDelivery);
    final statusLabel = order.status.isNotEmpty
        ? order.status[0].toUpperCase() + order.status.substring(1)
        : '';
    final addr = order.shippingAddress;

    // Filter items to the specific seller when navigated from a seller card
    final filteredItems = sellerKey != null
        ? order.items.where((i) => (i.sellerId ?? '__unknown__') == sellerKey).toList()
        : order.items;
    final sellerName = sellerKey != null && filteredItems.isNotEmpty
        ? (filteredItems.first.sellerName?.isNotEmpty == true
            ? filteredItems.first.sellerName!
            : 'Store')
        : null;

    // Derive per-seller (or full-order) financials from filteredItems
    final displaySubtotal = filteredItems.fold<double>(0, (s, i) => s + i.total);
    final displayTax = displaySubtotal * 0.08;
    final displayShipping = displaySubtotal >= 50 ? 0.0 : 9.99;
    final displayTotal = displaySubtotal + displayTax + displayShipping;

    return Scaffold(
      appBar: AppBar(
        title: Text(sellerName ?? 'Order Details'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSizes.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Order header ──────────────────────────────────────────────
            _SectionCard(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order #${order.shortId}',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 18,
                            color: context.onSurfaceColor,
                          ),
                        ),
                        if (dateStr.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Placed on $dateStr',
                            style: TextStyle(
                              fontSize: 13,
                              color: context.onSurfaceMuted,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: color.withAlpha(20),
                      borderRadius:
                          BorderRadius.circular(AppSizes.radiusFull),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(icon, size: 13, color: color),
                        const SizedBox(width: 5),
                        Text(
                          statusLabel,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: color,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSizes.sm),

            // ── Status section ────────────────────────────────────────────
            _SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionTitle(label: 'Status'),
                  const SizedBox(height: AppSizes.md),
                  if (isCancelled)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppSizes.md, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withAlpha(16),
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusMd),
                        border: Border.all(
                            color: AppColors.danger.withAlpha(40)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.cancel_outlined,
                              size: 16, color: AppColors.danger),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'This order has been cancelled',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.danger,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    _StatusStepper(currentStep: stepIndex),
                ],
              ),
            ),

            // ── Estimated delivery ────────────────────────────────────────
            if (!isCancelled && deliveryStr.isNotEmpty) ...[
              const SizedBox(height: AppSizes.sm),
              _SectionCard(
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha(20),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.local_shipping_outlined,
                        size: 22,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: AppSizes.md),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Estimated Delivery',
                          style: TextStyle(
                            fontSize: 12,
                            color: context.onSurfaceMuted,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          deliveryStr,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: context.onSurfaceColor,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: AppSizes.sm),

            // ── Delivery information ──────────────────────────────────────
            _SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionTitle(label: 'Delivery Information'),
                  const SizedBox(height: AppSizes.md),
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: 'Address',
                    value: [
                      addr.street,
                      '${addr.city}, ${addr.state} ${addr.zipCode}',
                      addr.country,
                    ].where((s) => s.trim().isNotEmpty).join('\n'),
                  ),
                  const SizedBox(height: AppSizes.sm),
                  _InfoRow(
                    icon: Icons.payment_outlined,
                    label: 'Payment Method',
                    value: order.paymentType.isNotEmpty
                        ? order.paymentType[0].toUpperCase() +
                            order.paymentType.substring(1)
                        : order.paymentType,
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSizes.sm),

            // ── Order items grouped by seller ─────────────────────────────
            _SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const _SectionTitle(label: 'Order Items'),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(26),
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusFull),
                        ),
                        child: Text(
                          '${filteredItems.length}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSizes.sm),
                  // Group items by seller (scoped to filteredItems)
                  ...() {
                    final groups = <String, List<OrderItemEntity>>{};
                    for (final item in filteredItems) {
                      final key = item.sellerId ?? '__unknown__';
                      groups.putIfAbsent(key, () => []);
                      groups[key]!.add(item);
                    }
                    final groupEntries = groups.entries.toList();
                    return [
                      for (var g = 0; g < groupEntries.length; g++) ...[
                        // Seller header
                        _DetailSellerHeader(
                          sellerName: groupEntries[g].value.first.sellerName,
                        ),
                        const SizedBox(height: AppSizes.xs),
                        // Items in group
                        ...groupEntries[g].value.asMap().entries.map((e) {
                          final isLastItem =
                              e.key == groupEntries[g].value.length - 1;
                          return Column(
                            children: [
                              _OrderItemRow(item: e.value),
                              if (!isLastItem)
                                const Divider(height: AppSizes.md),
                            ],
                          );
                        }),
                        // Message to seller (if set)
                        Builder(builder: (ctx) {
                          final sellerKey = groupEntries[g].key;
                          final msg = order.sellerMessages[sellerKey] ?? '';
                          if (msg.isEmpty) return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.only(top: AppSizes.sm),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: AppSizes.sm, vertical: 8),
                              decoration: BoxDecoration(
                                color: ctx.surfaceVariantColor,
                                borderRadius:
                                    BorderRadius.circular(AppSizes.radiusMd),
                                border: Border.all(
                                    color: ctx.borderColor, width: 0.5),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.chat_bubble_outline_rounded,
                                      size: 14, color: ctx.onSurfaceMuted),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Message to Seller',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: ctx.onSurfaceMuted,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          msg,
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: ctx.onSurfaceColor,
                                            height: 1.4,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                        // Divider between seller groups
                        if (g < groupEntries.length - 1)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                                vertical: AppSizes.sm),
                            child: Divider(
                                height: 1,
                                color: AppColors.primary.withAlpha(100),
                                thickness: 0.4),
                          ),
                      ],
                    ];
                  }(),
                ],
              ),
            ),

            const SizedBox(height: AppSizes.sm),

            // ── Order details (payment summary) ───────────────────────────
            _SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionTitle(label: 'Order Details'),
                  const SizedBox(height: AppSizes.md),
                  _SummaryRow(
                    label: 'Subtotal',
                    value: '\$${displaySubtotal.toStringAsFixed(2)}',
                  ),
                  const SizedBox(height: 8),
                  _SummaryRow(
                    label: 'Tax (8%)',
                    value: '\$${displayTax.toStringAsFixed(2)}',
                  ),
                  const SizedBox(height: 8),
                  _SummaryRow(
                    label: 'Shipping',
                    value: displayShipping == 0
                        ? 'Free'
                        : '\$${displayShipping.toStringAsFixed(2)}',
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: AppSizes.sm),
                    child: Divider(height: 1),
                  ),
                  _SummaryRow(
                    label: 'Total',
                    value: '\$${displayTotal.toStringAsFixed(2)}',
                    isTotal: true,
                  ),
                ],
              ),
            ),

            // ── Cancel order ──────────────────────────────────────────────
            if (order.status == 'pending') ...[
              const SizedBox(height: AppSizes.md),
              SizedBox(
                height: AppSizes.buttonHeight,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    side: const BorderSide(color: AppColors.danger),
                    shape: RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(AppSizes.radiusMd),
                    ),
                  ),
                  icon: const Icon(Icons.cancel_outlined, size: 18),
                  label: const Text(
                    'Cancel Order',
                    style: TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                  onPressed: () => _showCancelDialog(context),
                ),
              ),
            ],

            const SizedBox(height: AppSizes.xl),
          ],
        ),
      ),
    );
  }
}

// ── Section card ──────────────────────────────────────────────────────────────

class _DetailSellerHeader extends StatelessWidget {
  final String? sellerName;
  const _DetailSellerHeader({this.sellerName});

  @override
  Widget build(BuildContext context) {
    final name = sellerName?.isNotEmpty == true ? sellerName! : 'Store';
    return Container(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.sm, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withAlpha(12),
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
      ),
      child: Row(
        children: [
          SellerAvatar(name: name, size: 18),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              name,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
              ),
            ),
          ),
          const Icon(Icons.storefront_outlined,
              size: 13, color: AppColors.primary),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final Widget child;
  const _SectionCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSizes.md),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}

// ── Section title ─────────────────────────────────────────────────────────────

class _SectionTitle extends StatelessWidget {
  final String label;
  const _SectionTitle({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w800,
        color: context.onSurfaceColor,
      ),
    );
  }
}

// ── Info row ──────────────────────────────────────────────────────────────────

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow(
      {required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: context.onSurfaceMuted),
        const SizedBox(width: AppSizes.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: context.onSurfaceMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 13,
                  color: context.onSurfaceColor,
                  fontWeight: FontWeight.w500,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Summary row ───────────────────────────────────────────────────────────────

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isTotal;
  const _SummaryRow(
      {required this.label, required this.value, this.isTotal = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 15 : 13,
            color: isTotal ? context.onSurfaceColor : context.onSurfaceSecondary,
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w400,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 16 : 13,
            color: isTotal ? AppColors.primary : context.onSurfaceColor,
            fontWeight: isTotal ? FontWeight.w900 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

// ── Order item row ────────────────────────────────────────────────────────────

class _OrderItemRow extends StatelessWidget {
  final OrderItemEntity item;
  const _OrderItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final canNavigate = item.productId.isNotEmpty;
    return InkWell(
      onTap: canNavigate
          ? () => context.push('/products/${item.productId}')
          : null,
      borderRadius: BorderRadius.circular(AppSizes.radiusSm),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AppSizes.radiusSm),
              child: item.productImage.isNotEmpty
                  ? Image.network(
                      item.productImage,
                      width: 60,
                      height: 60,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          const _ImagePlaceholder(size: 60),
                    )
                  : const _ImagePlaceholder(size: 60),
            ),
            const SizedBox(width: AppSizes.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.productName,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: context.onSurfaceColor,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${item.price.toStringAsFixed(2)} × ${item.quantity}',
                    style: TextStyle(
                      fontSize: 12,
                      color: context.onSurfaceSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '\$${item.total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                if (canNavigate)
                  const Icon(Icons.chevron_right,
                      size: 16, color: AppColors.textMuted),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Status stepper ────────────────────────────────────────────────────────────

class _StatusStepper extends StatelessWidget {
  final int currentStep;
  const _StatusStepper({required this.currentStep});

  static const _steps = [
    (Icons.access_time_rounded, 'Placed'),
    (Icons.inventory_2_outlined, 'Packed'),
    (Icons.local_shipping_outlined, 'Shipped'),
    (Icons.check_circle_outline_rounded, 'Delivered'),
  ];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(_steps.length * 2 - 1, (i) {
        if (i.isOdd) {
          final lineIndex = i ~/ 2;
          final done = lineIndex < currentStep;
          return Expanded(
            child: Container(
              height: 2,
              color: done ? AppColors.primary : AppColors.border,
            ),
          );
        }

        final stepIndex = i ~/ 2;
        final done = stepIndex <= currentStep;
        final active = stepIndex == currentStep;
        final (icon, label) = _steps[stepIndex];

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: done ? AppColors.primary : AppColors.border,
                shape: BoxShape.circle,
                boxShadow: active
                    ? [
                        BoxShadow(
                          color: AppColors.primary.withAlpha(60),
                          blurRadius: 8,
                          spreadRadius: 1,
                        )
                      ]
                    : null,
              ),
              child: Icon(
                icon,
                size: 15,
                color: done ? Colors.white : AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                color: done ? AppColors.primary : AppColors.textMuted,
              ),
            ),
          ],
        );
      }),
    );
  }
}

// ── Image placeholder ─────────────────────────────────────────────────────────

class _ImagePlaceholder extends StatelessWidget {
  final double size;
  const _ImagePlaceholder({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.shimmerBase,
        borderRadius: BorderRadius.circular(AppSizes.radiusSm),
      ),
      child: Icon(Icons.image_outlined,
          size: size * 0.4, color: AppColors.textMuted),
    );
  }
}
