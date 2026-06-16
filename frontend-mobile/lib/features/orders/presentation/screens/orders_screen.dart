import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/order_bloc.dart';
import '../bloc/order_event.dart';
import '../bloc/order_state.dart';
import '../../domain/entities/order_entity.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class _TabDef {
  final String label;
  final List<String> statuses;
  const _TabDef(this.label, this.statuses);

  List<OrderEntity> filter(List<OrderEntity> orders) =>
      statuses.isEmpty ? orders : orders.where((o) => statuses.contains(o.status)).toList();
}

const _kTabs = [
  _TabDef('All',        []),
  _TabDef('Pending',    ['pending']),
  _TabDef('To Ship',    ['processing']),
  _TabDef('To Receive', ['shipped']),
  _TabDef('Complete',   ['delivered']),
  _TabDef('Cancelled',  ['cancelled']),
];

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _kTabs.length, vsync: this);
    final user = context.read<AuthBloc>().state.user;
    if (user != null) {
      context.read<OrderBloc>().add(OrdersLoadRequested(user.id));
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
      case 'pending':    return Icons.access_time;
      case 'processing': return Icons.inventory_2_outlined;
      case 'shipped':    return Icons.local_shipping_outlined;
      case 'delivered':  return Icons.check_circle_outline;
      case 'cancelled':  return Icons.cancel_outlined;
      default:           return Icons.help_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrderBloc, OrderState>(
      builder: (context, state) {
        final orders = state.orders;

        return Scaffold(
          appBar: AppBar(
            title: const Text(AppStrings.orders),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textSecondary,
                indicatorColor: AppColors.primary,
                indicatorWeight: 2.5,
                labelPadding: const EdgeInsets.symmetric(horizontal: 16),
                tabs: _kTabs.map((tab) {
                  final count = tab.filter(orders).length;
                  return Tab(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(tab.label,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600)),
                        if (count > 0) ...[
                          const SizedBox(width: 5),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withAlpha(26),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$count',
                              style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary),
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          body: state.status == OrderStatus.loading
              ? const LoadingWidget()
              : state.status == OrderStatus.failure
                  ? ErrorWidget2(
                      message: state.errorMessage ?? AppStrings.genericError,
                      onRetry: () {
                        final user = context.read<AuthBloc>().state.user;
                        if (user != null) {
                          context
                              .read<OrderBloc>()
                              .add(OrdersLoadRequested(user.id));
                        }
                      },
                    )
                  : TabBarView(
                      controller: _tabController,
                      children: _kTabs.map((tab) {
                        final filtered = tab.filter(orders);
                        return _OrderList(
                          orders: filtered,
                          emptyLabel: tab.label,
                          statusColor: _statusColor,
                          statusIcon: _statusIcon,
                          onRefresh: () async {
                            final user = context.read<AuthBloc>().state.user;
                            if (user != null) {
                              context
                                  .read<OrderBloc>()
                                  .add(OrdersLoadRequested(user.id));
                            }
                          },
                          onCancel: (orderId) {
                            final user = context.read<AuthBloc>().state.user;
                            if (user != null) {
                              context
                                  .read<OrderBloc>()
                                  .add(OrderCancelRequested(orderId, user.id));
                            }
                          },
                        );
                      }).toList(),
                    ),
        );
      },
    );
  }
}

class _OrderList extends StatelessWidget {
  final List<OrderEntity> orders;
  final String emptyLabel;
  final Color Function(String) statusColor;
  final IconData Function(String) statusIcon;
  final Future<void> Function() onRefresh;
  final void Function(String orderId) onCancel;

  const _OrderList({
    required this.orders,
    required this.emptyLabel,
    required this.statusColor,
    required this.statusIcon,
    required this.onRefresh,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return EmptyWidget(
        message: emptyLabel == 'All'
            ? AppStrings.noOrders
            : 'No $emptyLabel orders',
        icon: Icons.shopping_bag_outlined,
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(AppSizes.md),
        itemCount: orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSizes.sm),
        itemBuilder: (_, i) {
          final order = orders[i];
          final color = statusColor(order.status);
          return _OrderCard(
            order: order,
            statusColor: color,
            statusIcon: statusIcon(order.status),
            onCancel: order.status == 'pending'
                ? () => _showCancelDialog(context, order.id)
                : null,
          );
        },
      ),
    );
  }

  Future<void> _showCancelDialog(BuildContext context, String orderId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Cancel Order'),
        content:
            const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: const Text('Keep'),
          ),
          TextButton(
            style: TextButton.styleFrom(
                foregroundColor: AppColors.danger),
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );
    if (confirm == true) onCancel(orderId);
  }
}

class _OrderCard extends StatelessWidget {
  final OrderEntity order;
  final Color statusColor;
  final IconData statusIcon;
  final VoidCallback? onCancel;

  const _OrderCard({
    required this.order,
    required this.statusColor,
    required this.statusIcon,
    this.onCancel,
  });

  static void _showAllItems(
      BuildContext context, List<OrderItemEntity> items) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _OrderItemsSheet(items: items),
    );
  }

  static String _formatDelivery(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    try {
      final dt = DateTime.parse(raw).toLocal();
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    // 3 previews × (56 + 6) = 186px + overflow badge 56px = 242px
    // safely fits inside any card on phones ≥ 320px wide
    const imgSize = 56.0;
    const imgGap = 6.0;
    const maxPreview = 3;
    final preview = order.items.take(maxPreview).toList();
    final extra = order.items.length - maxPreview;

    final statusLabel = order.status.isNotEmpty
        ? order.status[0].toUpperCase() + order.status.substring(1)
        : '';
    final delivery = _formatDelivery(order.estimatedDelivery);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSizes.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Header: order id + status badge ───────────────────────────
            Row(
              children: [
                Text(
                  'Order #${order.shortId}',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 15),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha(26),
                    borderRadius:
                        BorderRadius.circular(AppSizes.radiusFull),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 13, color: statusColor),
                      const SizedBox(width: 4),
                      Text(
                        statusLabel,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSizes.sm),

            // ── Product image strip ────────────────────────────────────────
            Row(
              children: [
                ...preview.map((item) {
                  final canNavigate = item.productId.isNotEmpty;
                  return Padding(
                    padding: const EdgeInsets.only(right: imgGap),
                    child: GestureDetector(
                      onTap: canNavigate
                          ? () => context.push('/products/${item.productId}')
                          : null,
                      child: ClipRRect(
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusSm),
                        child: item.productImage.isNotEmpty
                            ? Image.network(
                                item.productImage,
                                width: imgSize,
                                height: imgSize,
                                fit: BoxFit.cover,
                                loadingBuilder: (_, child, p) => p == null
                                    ? child
                                    : const _ImagePlaceholder(size: imgSize),
                                errorBuilder: (_, __, ___) =>
                                    const _ImagePlaceholder(size: imgSize),
                              )
                            : const _ImagePlaceholder(size: imgSize),
                      ),
                    ),
                  );
                }),
                if (extra > 0)
                  GestureDetector(
                    onTap: () => _showAllItems(context, order.items),
                    child: Container(
                      width: imgSize,
                      height: imgSize,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha(20),
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusSm),
                        border: Border.all(
                            color: AppColors.primary.withAlpha(60)),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '+$extra',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: AppColors.primary,
                            ),
                          ),
                          const Text(
                            'more',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: AppSizes.sm),

            // ── Item count + total ─────────────────────────────────────────
            Text(
              '${order.items.length} item${order.items.length > 1 ? 's' : ''}'
              ' · \$${order.total.toStringAsFixed(2)}',
              style: const TextStyle(
                  color: AppColors.textSecondary, fontSize: 13),
            ),
            if (delivery.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.local_shipping_outlined,
                      size: 13, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    'Est. delivery: $delivery',
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ],
            if (onCancel != null) ...[
              const SizedBox(height: AppSizes.sm),
              const Divider(),
              const SizedBox(height: AppSizes.xs),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  style: TextButton.styleFrom(
                      foregroundColor: AppColors.danger),
                  icon: const Icon(Icons.cancel_outlined, size: 16),
                  label: const Text('Cancel Order'),
                  onPressed: onCancel,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Bottom sheet: full product list ───────────────────────────────────────────

class _OrderItemsSheet extends StatelessWidget {
  final List<OrderItemEntity> items;
  const _OrderItemsSheet({required this.items});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      expand: false,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(
              top: Radius.circular(AppSizes.radiusXl)),
        ),
        child: Column(
          children: [
            // Handle
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius:
                      BorderRadius.circular(AppSizes.radiusFull),
                ),
              ),
            ),
            // Title
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSizes.md, 4, AppSizes.md, AppSizes.sm),
              child: Row(
                children: [
                  const Text(
                    'Order Items',
                    style: TextStyle(
                        fontSize: 17, fontWeight: FontWeight.w800),
                  ),
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
                      '${items.length}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.pop(context),
                    color: AppColors.textSecondary,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Item list
            Expanded(
              child: ListView.separated(
                controller: scrollCtrl,
                padding: const EdgeInsets.symmetric(
                    vertical: AppSizes.sm),
                itemCount: items.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, indent: 72),
                itemBuilder: (ctx, i) {
                  final item = items[i];
                  final canNavigate = item.productId.isNotEmpty;
                  return InkWell(
                    onTap: canNavigate
                        ? () {
                            Navigator.pop(context);
                            ctx.push('/products/${item.productId}');
                          }
                        : null,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppSizes.md,
                          vertical: AppSizes.sm),
                      child: Row(
                        children: [
                          // Thumbnail
                          ClipRRect(
                            borderRadius: BorderRadius.circular(
                                AppSizes.radiusSm),
                            child: item.productImage.isNotEmpty
                                ? Image.network(
                                    item.productImage,
                                    width: 56,
                                    height: 56,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        const _ImagePlaceholder(
                                            size: 56),
                                  )
                                : const _ImagePlaceholder(size: 56),
                          ),
                          const SizedBox(width: AppSizes.sm),
                          // Name + price
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.productName,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '\$${item.price.toStringAsFixed(2)} × ${item.quantity}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Subtotal + chevron
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
                                    size: 16,
                                    color: AppColors.textMuted),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Image placeholder ──────────────────────────────────────────────────────────

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
