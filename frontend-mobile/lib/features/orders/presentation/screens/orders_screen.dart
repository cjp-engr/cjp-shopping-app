import 'dart:developer' as dev;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:toko_mart/shared/widgets/app_button.dart';
import '../bloc/order_bloc.dart';
import '../bloc/order_event.dart';
import '../bloc/order_state.dart';
import '../../domain/entities/order_entity.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../core/utils/order_utils.dart';
import '../../../../shared/widgets/image_placeholder.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/review_bottom_sheet.dart';
import '../../../../shared/widgets/seller_avatar.dart';
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
          appBar: AppBar(
            title: const Text(AppStrings.orders),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                labelColor: AppColors.primary,
                unselectedLabelColor: context.onSurfaceSecondary,
                indicatorColor: AppColors.primary,
                indicatorWeight: 2.5,
                dividerColor: context.borderColor,
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
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: context.onSurfaceColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your orders will appear here\nonce you start shopping.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: context.onSurfaceSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: AppSizes.lg),
            SizedBox(
              width: 180,
              height: AppSizes.buttonHeight,
              child: AppButton(
                label: AppStrings.browseProducts,
                onPressed: () => context.go('/'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Order card — emits one sub-card per seller group ─────────────────────────

class _OrderCard extends StatelessWidget {
  final OrderEntity order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final groups = groupItemsBySeller(order.items, (i) => i.sellerId);

    return Column(
      children: groups.entries
          .map((entry) => Padding(
                padding: const EdgeInsets.only(bottom: AppSizes.sm),
                child: _SellerOrderCard(
                  order: order,
                  sellerKey: entry.key,
                  items: entry.value,
                ),
              ))
          .toList(),
    );
  }
}

// ── Single seller order card ──────────────────────────────────────────────────

class _SellerOrderCard extends StatefulWidget {
  final OrderEntity order;
  final String sellerKey;
  final List<OrderItemEntity> items;

  const _SellerOrderCard({
    required this.order,
    required this.sellerKey,
    required this.items,
  });

  @override
  State<_SellerOrderCard> createState() => _SellerOrderCardState();
}

class _SellerOrderCardState extends State<_SellerOrderCard> {
  final Set<String> _reviewedProductIds = {};

  @override
  void initState() {
    super.initState();
    if (widget.order.status == 'delivered') {
      _fetchReviewStatuses();
    }
  }

  Future<void> _showConfirmReceivedDialog(
    BuildContext context,
    OrderEntity order,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Confirm Receipt'),
        content: const Text(
            'Have you received your order? This will mark the order as complete.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(false),
            child: const Text('Not Yet'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.success),
            onPressed: () => Navigator.of(dialogCtx).pop(true),
            child: const Text('Yes, Received'),
          ),
        ],
      ),
    );
    if (confirm == true && context.mounted) {
      context.read<OrderBloc>().add(OrderConfirmReceivedRequested(order.id));
    }
  }

  Future<void> _fetchReviewStatuses() async {
    try {
      final client = await ApiClient.get();
      for (final item in widget.items) {
        try {
          final res = await client.dio.get('/reviews/check/${item.productId}');
          final data = res.data as Map<String, dynamic>;
          if (data['hasReviewed'] == true && mounted) {
            setState(() => _reviewedProductIds.add(item.productId));
          }
        } catch (e, st) {
          dev.log('Review status fetch failed for ${item.productId}',
              error: e, stackTrace: st);
        }
      }
    } catch (e, st) {
      dev.log('ApiClient init failed in _fetchReviewStatuses',
          error: e, stackTrace: st);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final sellerKey = widget.sellerKey;
    final items = widget.items;
    final sellerName = items.first.sellerName?.isNotEmpty == true
        ? items.first.sellerName!
        : 'Store';
    final statusColor = orderStatusColor(order.status);
    final statusLabel = order.status.isNotEmpty
        ? order.status[0].toUpperCase() + order.status.substring(1)
        : '';
    final deliveryStr = formatOrderDate(order.estimatedDelivery);
    final isCancelled = order.status == 'cancelled';
    final groupTotal = items.fold<double>(0, (s, i) => s + i.total);
    final itemCount = items.fold<int>(0, (s, i) => s + i.quantity);

    return InkWell(
      onTap: () => context
          .push('/orders/${order.id}?seller=${Uri.encodeComponent(sellerKey)}'),
      borderRadius: BorderRadius.circular(AppSizes.radiusLg),
      child: Container(
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusLg),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(18),
              blurRadius: 16,
              offset: const Offset(0, 3),
            ),
            BoxShadow(
              color: Colors.black.withAlpha(6),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Seller + status header ──────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(
                  AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.sm),
              child: Row(
                children: [
                  SellerAvatar(name: sellerName, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      sellerName,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: context.onSurfaceColor,
                      ),
                    ),
                  ),
                  // Status pill badge
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withAlpha(24),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // ── Items ───────────────────────────────────────────────────
            ...items.map((item) => Column(
                  children: [
                    _OrderItemRow(item: item),
                    if (order.status == 'delivered')
                      Padding(
                        padding: const EdgeInsets.fromLTRB(
                            AppSizes.md, 0, AppSizes.md, AppSizes.sm),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: _reviewedProductIds.contains(item.productId)
                              ? const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.check_circle_rounded,
                                        size: 14, color: AppColors.success),
                                    SizedBox(width: 4),
                                    Text('Reviewed',
                                        style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.success)),
                                  ],
                                )
                              : InkWell(
                                  onTap: () => ReviewBottomSheet.show(
                                    context,
                                    productId: item.productId,
                                    orderId: order.id,
                                    productName: item.productName,
                                    productImage: item.productImage,
                                    onSubmitted: () async {
                                      if (mounted) {
                                        setState(() => _reviewedProductIds
                                            .add(item.productId));
                                      }
                                    },
                                  ),
                                  borderRadius:
                                      BorderRadius.circular(AppSizes.radiusSm),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(
                                        horizontal: 4, vertical: 2),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.star_rounded,
                                            size: 14, color: AppColors.warning),
                                        SizedBox(width: 4),
                                        Text('Write a Review',
                                            style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.warning)),
                                      ],
                                    ),
                                  ),
                                ),
                        ),
                      ),
                  ],
                )),

            const Divider(height: 1),

            // ── Store total ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSizes.md, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '$itemCount item${itemCount != 1 ? 's' : ''}',
                    style: TextStyle(
                      fontSize: 13,
                      color: context.onSurfaceSecondary,
                    ),
                  ),
                  Row(
                    children: [
                      Text(
                        'Total  ',
                        style: TextStyle(
                          fontSize: 13,
                          color: context.onSurfaceSecondary,
                        ),
                      ),
                      Text(
                        '\$${groupTotal.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: context.onSurfaceColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── Delivery banner / cancelled notice ──────────────────────
            if (isCancelled)
              Container(
                margin: const EdgeInsets.fromLTRB(
                    AppSizes.md, 0, AppSizes.md, AppSizes.md),
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
              )
            else if (deliveryStr.isNotEmpty) ...[
              Container(
                margin: const EdgeInsets.fromLTRB(
                    AppSizes.md, 0, AppSizes.md, AppSizes.sm),
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSizes.md, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.success.withAlpha(18),
                  borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_shipping_outlined,
                        size: 15, color: AppColors.success),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Expected delivery: $deliveryStr',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.success,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Action buttons — full-width row
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSizes.md, AppSizes.xs, AppSizes.md, AppSizes.md),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => context.push(
                            '/orders/${order.id}?seller=${Uri.encodeComponent(sellerKey)}'),
                        icon:
                            const Icon(Icons.local_shipping_outlined, size: 16),
                        label: const Text(AppStrings.trackOrder),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.circular(AppSizes.radiusSm),
                          ),
                          textStyle: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                    if (order.status == 'shipped') ...[
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () =>
                              _showConfirmReceivedDialog(context, order),
                          icon: const Icon(Icons.check_circle_outline_rounded,
                              size: 16),
                          label: const Text(AppStrings.orderReceived),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius:
                                  BorderRadius.circular(AppSizes.radiusSm),
                            ),
                            textStyle: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ] else
              const SizedBox(height: AppSizes.sm),
          ],
        ),
      ),
    );
  }
}

// ── Item row inside order card ────────────────────────────────────────────────

class _OrderItemRow extends StatelessWidget {
  final OrderItemEntity item;
  const _OrderItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.md, vertical: AppSizes.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppSizes.radiusMd),
            child: item.productImage.isNotEmpty
                ? Image.network(
                    item.productImage,
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                    loadingBuilder: (_, child, p) =>
                        p == null ? child : const ImagePlaceholder(size: 80),
                    errorBuilder: (_, __, ___) =>
                        const ImagePlaceholder(size: 80),
                  )
                : const ImagePlaceholder(size: 80),
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
                    fontWeight: FontWeight.w500,
                    color: context.onSurfaceColor,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '\$${item.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                    Text(
                      'x${item.quantity}',
                      style: TextStyle(
                        fontSize: 13,
                        color: context.onSurfaceSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
