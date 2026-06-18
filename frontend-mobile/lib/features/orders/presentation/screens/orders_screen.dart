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

  List<OrderEntity> filter(List<OrderEntity> orders) => statuses.isEmpty
      ? orders
      : orders.where((o) => statuses.contains(o.status)).toList();
}

const _kTabs = [
  _TabDef('Pending', ['pending']),
  _TabDef('To Ship', ['processing']),
  _TabDef('To Receive', ['shipped']),
  _TabDef('Complete', ['delivered']),
  _TabDef('Cancelled', ['cancelled']),
];

int _statusStep(String status) {
  switch (status) {
    case 'pending':
      return 0;
    case 'processing':
      return 1;
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    default:
      return -1;
  }
}

Color _statusColor(String status) {
  switch (status) {
    case 'pending':
      return AppColors.warning;
    case 'processing':
      return AppColors.primary;
    case 'shipped':
      return AppColors.primaryLight;
    case 'delivered':
      return AppColors.success;
    case 'cancelled':
      return AppColors.danger;
    default:
      return AppColors.textMuted;
  }
}

IconData _statusIcon(String status) {
  switch (status) {
    case 'pending':
      return Icons.access_time_rounded;
    case 'processing':
      return Icons.inventory_2_outlined;
    case 'shipped':
      return Icons.local_shipping_outlined;
    case 'delivered':
      return Icons.check_circle_outline_rounded;
    case 'cancelled':
      return Icons.cancel_outlined;
    default:
      return Icons.help_outline;
  }
}

String _formatDate(String? raw) {
  if (raw == null || raw.isEmpty) return '';
  try {
    final dt = DateTime.parse(raw).toLocal();
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  } catch (_) {
    return raw;
  }
}

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

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrderBloc, OrderState>(
      builder: (context, state) {
        final orders = state.orders;

        return Scaffold(
          backgroundColor: AppColors.surfaceVariant,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            title: const Text(AppStrings.orders),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Container(
                color: AppColors.surface,
                child: TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  indicatorWeight: 2.5,
                  dividerColor: AppColors.border,
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
                          onRefresh: () async {
                            final user = context.read<AuthBloc>().state.user;
                            if (user != null) {
                              context
                                  .read<OrderBloc>()
                                  .add(OrdersLoadRequested(user.id));
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

// ── Order list ────────────────────────────────────────────────────────────────

class _OrderList extends StatelessWidget {
  final List<OrderEntity> orders;
  final String emptyLabel;
  final Future<void> Function() onRefresh;

  const _OrderList({
    required this.orders,
    required this.emptyLabel,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (orders.isEmpty) {
      return _EmptyOrdersState(label: emptyLabel);
    }

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(
            AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.xl),
        itemCount: orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSizes.sm),
        itemBuilder: (_, i) => _OrderCard(order: orders[i]),
      ),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyOrdersState extends StatelessWidget {
  final String label;
  const _EmptyOrdersState({required this.label});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSizes.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(16),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shopping_bag_outlined,
                  size: 40, color: AppColors.primary),
            ),
            const SizedBox(height: AppSizes.md),
            Text(
              label == 'All'
                  ? 'No orders yet'
                  : 'No ${label.toLowerCase()} orders',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Your orders will appear here\nonce you start shopping.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: AppSizes.lg),
            SizedBox(
              width: 180,
              height: AppSizes.buttonHeight,
              child: ElevatedButton(
                onPressed: () => context.go('/'),
                child: const Text('Browse Products'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Order card ────────────────────────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  final OrderEntity order;

  const _OrderCard({required this.order});

  static void _showAllItems(BuildContext context, List<OrderItemEntity> items) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _OrderItemsSheet(items: items),
    );
  }

  @override
  Widget build(BuildContext context) {
    const imgSize = 64.0;
    const imgGap = 8.0;
    const maxPreview = 3;
    final preview = order.items.take(maxPreview).toList();
    final extra = order.items.length - maxPreview;

    final color = _statusColor(order.status);
    final icon = _statusIcon(order.status);
    final stepIndex = _statusStep(order.status);
    final isCancelled = order.status == 'cancelled';
    final dateStr = _formatDate(order.createdAt);
    final deliveryStr = _formatDate(order.estimatedDelivery);

    final statusLabel = order.status.isNotEmpty
        ? order.status[0].toUpperCase() + order.status.substring(1)
        : '';

    return GestureDetector(
      onTap: () => context.push('/orders/${order.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppSizes.radiusLg),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 12,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Card header ───────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.sm),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order #${order.shortId}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: AppColors.textPrimary,
                            letterSpacing: -0.2,
                          ),
                        ),
                        if (dateStr.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            dateStr,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSizes.sm),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: color.withAlpha(20),
                      borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(icon, size: 12, color: color),
                        const SizedBox(width: 4),
                        Text(
                          statusLabel,
                          style: TextStyle(
                            fontSize: 12,
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

            const Divider(height: 1),

            // ── Product image strip + total ────────────────────────────────────
            Padding(
              padding: const EdgeInsets.all(AppSizes.md),
              child: Row(
                children: [
                  ...preview.map((item) {
                    return Padding(
                      padding: const EdgeInsets.only(right: imgGap),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
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
                    );
                  }),
                  if (extra > 0)
                    GestureDetector(
                      onTap: () => _showAllItems(context, order.items),
                      child: Container(
                        width: imgSize,
                        height: imgSize,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withAlpha(16),
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusMd),
                          border: Border.all(
                              color: AppColors.primary.withAlpha(50)),
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
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '\$${order.total.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${order.items.length} item${order.items.length > 1 ? 's' : ''}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── Status section ────────────────────────────────────────────────
            if (isCancelled)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSizes.md, 0, AppSizes.md, AppSizes.md),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSizes.md, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withAlpha(16),
                    borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                    border: Border.all(color: AppColors.danger.withAlpha(40)),
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
                ),
              )
            else ...[
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.sm),
                child: _StatusStepper(currentStep: stepIndex),
              ),
              if (deliveryStr.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                      AppSizes.md, 0, AppSizes.md, AppSizes.sm),
                  child: Row(
                    children: [
                      const Icon(Icons.local_shipping_outlined,
                          size: 13, color: AppColors.textMuted),
                      const SizedBox(width: 5),
                      Text(
                        'Est. delivery: $deliveryStr',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                )
              else
                const SizedBox(height: AppSizes.sm),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Status stepper ────────────────────────────────────────────────────────────

class _StatusStepper extends StatelessWidget {
  final int currentStep; // 0=pending, 1=processing, 2=shipped, 3=delivered

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

// ── Bottom sheet: full product list ──────────────────────────────────────────

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
          borderRadius:
              BorderRadius.vertical(top: Radius.circular(AppSizes.radiusXl)),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSizes.md, 4, AppSizes.md, AppSizes.sm),
              child: Row(
                children: [
                  const Text(
                    'Order Items',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(26),
                      borderRadius: BorderRadius.circular(AppSizes.radiusFull),
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
            Expanded(
              child: ListView.separated(
                controller: scrollCtrl,
                padding: const EdgeInsets.symmetric(vertical: AppSizes.sm),
                itemCount: items.length,
                separatorBuilder: (_, __) =>
                    const Divider(height: 1, indent: 76),
                itemBuilder: (ctx, i) {
                  final item = items[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSizes.md, vertical: AppSizes.sm),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusSm),
                          child: item.productImage.isNotEmpty
                              ? Image.network(
                                  item.productImage,
                                  width: 56,
                                  height: 56,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) =>
                                      const _ImagePlaceholder(size: 56),
                                )
                              : const _ImagePlaceholder(size: 56),
                        ),
                        const SizedBox(width: AppSizes.sm),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
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
                          ],
                        ),
                      ],
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
