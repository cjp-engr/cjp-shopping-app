import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../products/domain/entities/product_entity.dart';
import '../../data/models/seller_order_model.dart';
import '../bloc/seller_bloc.dart';
import '../bloc/seller_event.dart';
import '../bloc/seller_state.dart';
import '../../../../shared/widgets/loading_widget.dart';

class SellerDashboardScreen extends StatefulWidget {
  const SellerDashboardScreen({super.key});

  @override
  State<SellerDashboardScreen> createState() => _SellerDashboardScreenState();
}

class _SellerDashboardScreenState extends State<SellerDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _categoryFilter = 'All';
  String _orderStatusFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SellerBloc>()
        ..add(const SellerProductsLoadRequested())
        ..add(const SellerOrdersLoadRequested());
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _confirmDelete(BuildContext context, ProductEntity product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSizes.radiusLg)),
        title: const Text('Delete Product'),
        content: Text('Remove "${product.name}" from your shop?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context
                  .read<SellerBloc>()
                  .add(SellerProductDeleteRequested(product.id));
            },
            child: const Text(
              'Delete',
              style: TextStyle(color: AppColors.danger),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: AppColors.bannerStart,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Seller Dashboard',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            tooltip: 'Refresh',
            onPressed: () => context.read<SellerBloc>()
              ..add(const SellerProductsLoadRequested())
              ..add(const SellerOrdersLoadRequested()),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle:
              const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: [
            const Tab(
              icon: Icon(Icons.shopping_bag_outlined, size: 18),
              text: 'My Products',
            ),
            BlocBuilder<SellerBloc, SellerState>(
              buildWhen: (p, c) =>
                  p.actionableOrderCount != c.actionableOrderCount,
              builder: (context, state) {
                final badge = state.actionableOrderCount;
                return Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.receipt_long_outlined, size: 18),
                      const SizedBox(width: 6),
                      const Text('Orders'),
                      if (badge > 0) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppColors.danger,
                            borderRadius: BorderRadius.circular(
                                AppSizes.radiusFull),
                          ),
                          child: Text(
                            '$badge',
                            style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Colors.white),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
      body: BlocConsumer<SellerBloc, SellerState>(
        listenWhen: (p, c) =>
            (p.status != c.status && c.status == SellerStatus.failure) ||
            (p.ordersStatus != c.ordersStatus &&
                c.ordersStatus == SellerOrdersStatus.failure),
        listener: (context, state) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage ?? 'Something went wrong'),
              backgroundColor: AppColors.danger,
              duration: const Duration(seconds: 2),
            ),
          );
        },
        builder: (context, state) {
          return Column(
            children: [
              // ── Stats row ────────────────────────────────────────────────
              _StatsRow(state: state),

              // ── Tab content ──────────────────────────────────────────────
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _ProductsTab(
                      state: state,
                      categoryFilter: _categoryFilter,
                      onCategoryChanged: (cat) =>
                          setState(() => _categoryFilter = cat),
                      onDelete: (p) => _confirmDelete(context, p),
                    ),
                    _OrdersTab(
                      state: state,
                      statusFilter: _orderStatusFilter,
                      onStatusChanged: (s) =>
                          setState(() => _orderStatusFilter = s),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: BlocBuilder<SellerBloc, SellerState>(
        builder: (context, state) {
          return ListenableBuilder(
            listenable: _tabController,
            builder: (context, _) => _tabController.index == 0
                ? FloatingActionButton(
                    onPressed: () => context.push('/seller/add'),
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    child: const Icon(Icons.add),
                  )
                : const SizedBox.shrink(),
          );
        },
      ),
    );
  }
}

// ── Stats row ─────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  final SellerState state;
  const _StatsRow({required this.state});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
          AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.md),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        border: Border(
          bottom: BorderSide(color: context.borderColor),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _StatCard(
            icon: Icons.shopping_bag_rounded,
            iconBg: AppColors.primaryLight,
            iconColor: AppColors.primary,
            value: '${state.products.length}',
            label: 'Products',
          ),
          const SizedBox(width: AppSizes.sm),
          _StatCard(
            icon: Icons.inventory_2_rounded,
            iconBg: AppColors.warningSurface,
            iconColor: AppColors.warning,
            value: '${state.activeOrderCount}',
            label: 'Active',
          ),
          const SizedBox(width: AppSizes.sm),
          _StatCard(
            icon: Icons.local_shipping_rounded,
            iconBg: const Color(0xFFFFF7ED),
            iconColor: const Color(0xFFF97316),
            value: '${state.pendingOrderCount}',
            label: 'To Ship',
          ),
          const SizedBox(width: AppSizes.sm),
          _StatCard(
            icon: Icons.attach_money_rounded,
            iconBg: AppColors.successSurface,
            iconColor: AppColors.success,
            value: '\$${state.revenue.toStringAsFixed(0)}',
            label: 'Revenue',
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String value;
  final String label;

  const _StatCard({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.value,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: context.bgColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(color: context.borderColor),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconBg,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: context.onSurfaceColor,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Products tab ──────────────────────────────────────────────────────────────

class _ProductsTab extends StatelessWidget {
  final SellerState state;
  final String categoryFilter;
  final ValueChanged<String> onCategoryChanged;
  final ValueChanged<ProductEntity> onDelete;

  const _ProductsTab({
    required this.state,
    required this.categoryFilter,
    required this.onCategoryChanged,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    if (state.status == SellerStatus.loading) {
      return const LoadingWidget();
    }

    if (state.products.isEmpty && state.status != SellerStatus.initial) {
      return EmptyWidget(
        icon: Icons.storefront_outlined,
        message: 'No products yet.\nTap + to list your first product.',
        actionLabel: 'Add Product',
        onAction: () => context.push('/seller/add'),
      );
    }

    final categories = [
      'All',
      ...{for (final p in state.products) p.category},
    ];
    final filtered = categoryFilter == 'All'
        ? state.products
        : state.products.where((p) => p.category == categoryFilter).toList();

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async =>
          context.read<SellerBloc>().add(const SellerProductsLoadRequested()),
      child: Column(
        children: [
          // Category filter chips
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSizes.md, vertical: AppSizes.xs),
              itemCount: categories.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(width: AppSizes.xs),
              itemBuilder: (context, i) {
                final cat = categories[i];
                final isActive = cat == categoryFilter;
                final count = cat == 'All'
                    ? state.products.length
                    : state.products
                        .where((p) => p.category == cat)
                        .length;
                return GestureDetector(
                  onTap: () => onCategoryChanged(cat),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: isActive
                          ? AppColors.primary
                          : Colors.transparent,
                      borderRadius:
                          BorderRadius.circular(AppSizes.radiusFull),
                      border: Border.all(
                        color: isActive
                            ? AppColors.primary
                            : AppColors.border,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          cat,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isActive
                                ? Colors.white
                                : AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: isActive
                                ? Colors.white.withAlpha(51)
                                : AppColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(
                                AppSizes.radiusFull),
                          ),
                          child: Text(
                            '$count',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isActive
                                  ? Colors.white
                                  : AppColors.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Text(
                      'No products in this category.',
                      style: TextStyle(color: context.onSurfaceMuted),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                        AppSizes.md, AppSizes.sm, AppSizes.md, 96),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSizes.sm),
                    itemBuilder: (context, index) {
                      final product = filtered[index];
                      return _ProductTile(
                        product: product,
                        isSaving: state.status == SellerStatus.saving,
                        onEdit: () => context.push(
                          '/seller/edit/${product.id}',
                          extra: product,
                        ),
                        onDelete: () => onDelete(product),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Orders tab ────────────────────────────────────────────────────────────────

class _OrdersTab extends StatelessWidget {
  final SellerState state;
  final String statusFilter;
  final ValueChanged<String> onStatusChanged;

  const _OrdersTab({
    required this.state,
    required this.statusFilter,
    required this.onStatusChanged,
  });

  static const _allTabs = [
    _StatusTab('all', 'All', Icons.receipt_long_outlined),
    _StatusTab('pending', 'Pending', Icons.access_time_rounded),
    _StatusTab('processing', 'To Ship', Icons.inventory_2_outlined),
    _StatusTab('shipped', 'To Receive', Icons.local_shipping_outlined),
    _StatusTab('delivered', 'Delivered', Icons.check_circle_outline_rounded),
    _StatusTab('cancelled', 'Cancelled', Icons.cancel_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    if (state.ordersStatus == SellerOrdersStatus.loading) {
      return const LoadingWidget();
    }

    if (state.orders.isEmpty &&
        state.ordersStatus == SellerOrdersStatus.success) {
      return const EmptyWidget(
        icon: Icons.receipt_long_outlined,
        message: 'No orders yet for your products.',
      );
    }

    final visibleTabs = _allTabs
        .where((t) =>
            t.key == 'all' || state.orders.any((o) => o.status == t.key))
        .toList();

    final filtered = statusFilter == 'all'
        ? state.orders
        : state.orders.where((o) => o.status == statusFilter).toList();

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: () async =>
          context.read<SellerBloc>().add(const SellerOrdersLoadRequested()),
      child: Column(
        children: [
          // Status filter chips
          if (state.orders.isNotEmpty)
            SizedBox(
              height: 48,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSizes.md, vertical: AppSizes.xs),
                itemCount: visibleTabs.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(width: AppSizes.xs),
                itemBuilder: (context, i) {
                  final tab = visibleTabs[i];
                  final isActive = tab.key == statusFilter;
                  final count = tab.key == 'all'
                      ? state.orders.length
                      : state.orders
                          .where((o) => o.status == tab.key)
                          .length;
                  return GestureDetector(
                    onTap: () => onStatusChanged(tab.key),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppColors.primary
                            : Colors.transparent,
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusFull),
                        border: Border.all(
                          color: isActive
                              ? AppColors.primary
                              : AppColors.border,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(tab.icon,
                              size: 13,
                              color: isActive
                                  ? Colors.white
                                  : AppColors.textMuted),
                          const SizedBox(width: 4),
                          Text(
                            tab.label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: isActive
                                  ? Colors.white
                                  : AppColors.textMuted,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? Colors.white.withAlpha(51)
                                  : AppColors.surfaceVariant,
                              borderRadius: BorderRadius.circular(
                                  AppSizes.radiusFull),
                            ),
                            child: Text(
                              '$count',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: isActive
                                    ? Colors.white
                                    : AppColors.textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Text(
                      'No orders with this status.',
                      style: TextStyle(color: context.onSurfaceMuted),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                        AppSizes.md, AppSizes.sm, AppSizes.md, AppSizes.xl),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: AppSizes.sm),
                    itemBuilder: (context, index) => _OrderCard(
                      order: filtered[index],
                      onTap: () => _SellerOrderDetailSheet.show(
                          context, filtered[index]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _StatusTab {
  final String key;
  final String label;
  final IconData icon;
  const _StatusTab(this.key, this.label, this.icon);
}

// ── Order card ────────────────────────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  final SellerOrderData order;
  final VoidCallback? onTap;
  const _OrderCard({required this.order, this.onTap});

  @override
  Widget build(BuildContext context) {
    final cfg = _statusConfig(order.status);

    return Material(
      color: context.surfaceColor,
      borderRadius: BorderRadius.circular(AppSizes.radiusLg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSizes.radiusLg),
            border: Border.all(color: context.borderColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(6),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.md, vertical: 10),
            child: Row(
              children: [
                // Order ID with monospaced style
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: context.bgColor,
                    borderRadius:
                        BorderRadius.circular(AppSizes.radiusSm),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Text(
                    '#${order.shortId}',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: context.onSurfaceColor,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _StatusBadge(label: cfg.label, color: cfg.color),
                const Spacer(),
                Text(
                  _formatDate(order.createdAt),
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: context.borderColor),

          Padding(
            padding: const EdgeInsets.all(AppSizes.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Buyer ────────────────────────────────────────────────
                if (order.buyer != null) ...[
                  Row(
                    children: [
                      _BuyerAvatar(name: order.buyer!.fullName),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              order.buyer!.fullName,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: context.onSurfaceColor,
                              ),
                            ),
                            Text(
                              order.buyer!.email,
                              style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textMuted),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '\$${order.total.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSizes.sm),
                ],

                // ── Items ────────────────────────────────────────────────
                ...order.items.map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: _OrderItemRow(item: item),
                    )),

                // ── Actions ──────────────────────────────────────────────
                if (order.canMarkToShip ||
                    order.canMarkShipped ||
                    order.canCancel) ...[
                  const SizedBox(height: 10),
                  Divider(height: 1, color: context.borderColor),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      if (order.canMarkToShip)
                        Expanded(
                          child: _OrderActionBtn(
                            label: 'Mark to Ship',
                            icon: Icons.inventory_2_outlined,
                            color: AppColors.primary,
                            onTap: () =>
                                context.read<SellerBloc>().add(
                                    SellerOrderStatusUpdateRequested(
                                        order.id, 'processing')),
                          ),
                        ),
                      if (order.canMarkShipped)
                        Expanded(
                          child: _OrderActionBtn(
                            label: 'Mark Shipped',
                            icon: Icons.local_shipping_outlined,
                            color: AppColors.primary,
                            onTap: () =>
                                context.read<SellerBloc>().add(
                                    SellerOrderStatusUpdateRequested(
                                        order.id, 'shipped')),
                          ),
                        ),
                      if ((order.canMarkToShip || order.canMarkShipped) &&
                          order.canCancel)
                        const SizedBox(width: AppSizes.sm),
                      if (order.canCancel)
                        Expanded(
                          child: _OrderActionBtn(
                            label: 'Cancel',
                            icon: Icons.cancel_outlined,
                            color: AppColors.danger,
                            onTap: () =>
                                context.read<SellerBloc>().add(
                                    SellerOrderStatusUpdateRequested(
                                        order.id, 'cancelled')),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return iso;
    }
  }

  _StatusConfig _statusConfig(String status) {
    switch (status) {
      case 'pending':
        return const _StatusConfig('Pending', AppColors.warning);
      case 'processing':
        return const _StatusConfig('To Ship', AppColors.primary);
      case 'shipped':
        return const _StatusConfig('To Receive', Color(0xFF6B7280));
      case 'delivered':
        return const _StatusConfig('Delivered', AppColors.success);
      case 'cancelled':
        return const _StatusConfig('Cancelled', AppColors.danger);
      default:
        return _StatusConfig(status, AppColors.textMuted);
    }
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  const _StatusConfig(this.label, this.color);
}

class _BuyerAvatar extends StatelessWidget {
  final String name;
  final double size;
  const _BuyerAvatar({required this.name, this.size = 36});

  String get _initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        color: AppColors.primaryLight,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        _initials,
        style: TextStyle(
          fontSize: size * 0.35,
          fontWeight: FontWeight.w700,
          color: AppColors.primary,
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  const _StatusBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(22),
        borderRadius: BorderRadius.circular(AppSizes.radiusFull),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _OrderItemRow extends StatelessWidget {
  final SellerOrderItemData item;
  const _OrderItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSizes.sm),
      decoration: BoxDecoration(
        color: context.bgColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusSm),
        border: Border.all(color: context.borderColor),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppSizes.radiusSm),
            child: item.productImage.isNotEmpty
                ? Image.network(
                    item.productImage,
                    width: 42,
                    height: 42,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _placeholder(),
                  )
                : _placeholder(),
          ),
          const SizedBox(width: AppSizes.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: context.onSurfaceColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Qty ${item.quantity} × \$${item.price.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          Text(
            '\$${item.lineTotal.toStringAsFixed(2)}',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: context.onSurfaceColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() => Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(AppSizes.radiusSm),
        ),
        child: const Icon(Icons.inventory_2_outlined,
            size: 18, color: AppColors.textMuted),
      );
}

class _OrderActionBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _OrderActionBtn({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: color.withAlpha(15),
          borderRadius: BorderRadius.circular(AppSizes.radiusSm),
          border: Border.all(color: color.withAlpha(80)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Product tile ──────────────────────────────────────────────────────────────

class _ProductTile extends StatelessWidget {
  final ProductEntity product;
  final bool isSaving;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _ProductTile({
    required this.product,
    required this.isSaving,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.surfaceColor,
      borderRadius: BorderRadius.circular(AppSizes.radiusLg),
      child: InkWell(
        onTap: () => context.push('/products/${product.id}'),
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSizes.radiusLg),
            border: Border.all(color: context.borderColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(6),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSizes.sm + 2),
            child: Row(
              children: [
                // Product image
                ClipRRect(
                  borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                  child: product.image.isNotEmpty
                      ? Image.network(
                          product.image,
                          width: 76,
                          height: 76,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _placeholder(),
                        )
                      : _placeholder(),
                ),
                const SizedBox(width: AppSizes.sm + 2),

                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category chip
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusFull),
                        ),
                        child: Text(
                          product.category,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          height: 1.3,
                          color: context.onSurfaceColor,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          Text(
                            '\$${product.price.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _StockBadge(product: product),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSizes.xs),

                // Actions column — stop tap from bubbling to InkWell
                GestureDetector(
                  onTap: () {},
                  behavior: HitTestBehavior.opaque,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _ActionIconBtn(
                        icon: Icons.edit_outlined,
                        color: AppColors.primary,
                        bgColor: AppColors.primaryLight,
                        onPressed: isSaving ? null : onEdit,
                        tooltip: 'Edit',
                      ),
                      const SizedBox(height: 8),
                      _ActionIconBtn(
                        icon: Icons.delete_outline_rounded,
                        color: AppColors.danger,
                        bgColor: AppColors.dangerSurface,
                        onPressed: isSaving ? null : onDelete,
                        tooltip: 'Delete',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
        width: 76,
        height: 76,
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
        ),
        child: const Icon(Icons.inventory_2_outlined,
            color: AppColors.textMuted),
      );
}

class _ActionIconBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color bgColor;
  final VoidCallback? onPressed;
  final String tooltip;

  const _ActionIconBtn({
    required this.icon,
    required this.color,
    required this.bgColor,
    required this.tooltip,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final active = onPressed != null;
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onPressed,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: active ? bgColor : AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(AppSizes.radiusSm),
          ),
          child: Icon(
            icon,
            size: 18,
            color: active ? color : AppColors.textMuted,
          ),
        ),
      ),
    );
  }
}

class _StockBadge extends StatelessWidget {
  final ProductEntity product;
  const _StockBadge({required this.product});

  @override
  Widget build(BuildContext context) {
    final color = product.inStock ? AppColors.success : AppColors.danger;
    final label =
        product.inStock ? 'Stock: ${product.stock}' : 'Out of Stock';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(22),
        borderRadius: BorderRadius.circular(AppSizes.radiusFull),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Seller Order Detail Sheet ─────────────────────────────────────────────────

class _SellerOrderDetailSheet extends StatelessWidget {
  final SellerOrderData order;
  const _SellerOrderDetailSheet({required this.order});

  static void show(BuildContext context, SellerOrderData order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _SellerOrderDetailSheet(order: order),
    );
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cfg = _statusCfg(order.status);
    final addr = order.shippingAddress;

    // Compute subtotal from items if backend value is 0
    final computedSubtotal = order.subtotal > 0
        ? order.subtotal
        : order.items.fold<double>(0, (s, i) => s + i.lineTotal);
    final tax = order.tax > 0
        ? order.tax
        : computedSubtotal * 0.08;
    final shipping = (order.shipping > 0 || computedSubtotal >= 50)
        ? order.shipping
        : 9.99;
    final total = order.total > 0
        ? order.total
        : computedSubtotal + tax + shipping;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: context.bgColor,
            borderRadius: const BorderRadius.vertical(
                top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // ── Handle ──────────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 8),
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: context.borderColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // ── Sheet header ────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSizes.md, 0, AppSizes.md, AppSizes.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Order #${order.shortId}',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: context.onSurfaceColor,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _formatDate(order.createdAt),
                            style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                    _StatusBadge(label: cfg.label, color: cfg.color),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: context.surfaceVariantColor,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.close,
                            size: 16, color: context.onSurfaceMuted),
                      ),
                    ),
                  ],
                ),
              ),

              Divider(height: 1, color: context.borderColor),

              // ── Scrollable body ─────────────────────────────────────────
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(
                      AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.xl),
                  children: [
                    // ── Buyer info ─────────────────────────────────────────
                    if (order.buyer != null) ...[
                      _SheetSection(
                        title: 'Buyer',
                        icon: Icons.person_outline_rounded,
                        child: Row(
                          children: [
                            _BuyerAvatar(
                                name: order.buyer!.fullName,
                                size: 48),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    order.buyer!.fullName,
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: context.onSurfaceColor,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Row(
                                    children: [
                                      Icon(Icons.email_outlined,
                                          size: 13,
                                          color: context.onSurfaceMuted),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          order.buyer!.email,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: context.onSurfaceMuted,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSizes.sm),
                    ],

                    // ── Shipping address ────────────────────────────────────
                    if (addr != null && addr.formatted.isNotEmpty) ...[
                      _SheetSection(
                        title: 'Shipping Address',
                        icon: Icons.location_on_outlined,
                        child: Text(
                          addr.formatted,
                          style: TextStyle(
                            fontSize: 13,
                            color: context.onSurfaceColor,
                            height: 1.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSizes.sm),
                    ],

                    // ── Items ───────────────────────────────────────────────
                    _SheetSection(
                      title: 'Items (${order.items.length})',
                      icon: Icons.shopping_bag_outlined,
                      child: Column(
                        children: order.items.asMap().entries.map((e) {
                          final isLast =
                              e.key == order.items.length - 1;
                          return Column(
                            children: [
                              _DetailItemRow(item: e.value),
                              if (!isLast) ...[
                                const SizedBox(height: 6),
                                Divider(
                                    height: 1,
                                    color: context.borderColor),
                                const SizedBox(height: 6),
                              ],
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: AppSizes.sm),

                    // ── Cost breakdown ──────────────────────────────────────
                    _SheetSection(
                      title: 'Cost Breakdown',
                      icon: Icons.receipt_outlined,
                      child: Column(
                        children: [
                          _SummaryLine(
                            label: 'Subtotal',
                            value:
                                '\$${computedSubtotal.toStringAsFixed(2)}',
                          ),
                          const SizedBox(height: 8),
                          _SummaryLine(
                            label: 'Tax',
                            value: '\$${tax.toStringAsFixed(2)}',
                          ),
                          const SizedBox(height: 8),
                          _SummaryLine(
                            label: 'Shipping',
                            value: shipping == 0
                                ? 'Free'
                                : '\$${shipping.toStringAsFixed(2)}',
                          ),
                          Padding(
                            padding:
                                const EdgeInsets.symmetric(vertical: 10),
                            child: Divider(
                                height: 1, color: context.borderColor),
                          ),
                          _SummaryLine(
                            label: 'Total',
                            value: '\$${total.toStringAsFixed(2)}',
                            isTotal: true,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  _StatusConfig _statusCfg(String status) {
    switch (status) {
      case 'pending':
        return const _StatusConfig('Pending', AppColors.warning);
      case 'processing':
        return const _StatusConfig('To Ship', AppColors.primary);
      case 'shipped':
        return const _StatusConfig('To Receive', Color(0xFF6B7280));
      case 'delivered':
        return const _StatusConfig('Delivered', AppColors.success);
      case 'cancelled':
        return const _StatusConfig('Cancelled', AppColors.danger);
      default:
        return _StatusConfig(status, AppColors.textMuted);
    }
  }
}

class _SheetSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;
  const _SheetSection(
      {required this.title, required this.icon, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSizes.md),
      decoration: BoxDecoration(
        color: context.surfaceColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        border: Border.all(color: context.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: context.onSurfaceMuted),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: context.onSurfaceMuted,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _DetailItemRow extends StatelessWidget {
  final SellerOrderItemData item;
  const _DetailItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppSizes.radiusSm),
          child: item.productImage.isNotEmpty
              ? Image.network(
                  item.productImage,
                  width: 50,
                  height: 50,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _placeholder(),
                )
              : _placeholder(),
        ),
        const SizedBox(width: AppSizes.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.productName,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: context.onSurfaceColor,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '\$${item.price.toStringAsFixed(2)} × ${item.quantity}',
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
        Text(
          '\$${item.lineTotal.toStringAsFixed(2)}',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }

  Widget _placeholder() => Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          color: AppColors.surfaceVariant,
          borderRadius: BorderRadius.circular(AppSizes.radiusSm),
        ),
        child: const Icon(Icons.inventory_2_outlined,
            size: 20, color: AppColors.textMuted),
      );
}

class _SummaryLine extends StatelessWidget {
  final String label;
  final String value;
  final bool isTotal;
  const _SummaryLine(
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
            fontWeight:
                isTotal ? FontWeight.w800 : FontWeight.w400,
            color: isTotal
                ? context.onSurfaceColor
                : context.onSurfaceSecondary,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 16 : 13,
            fontWeight:
                isTotal ? FontWeight.w900 : FontWeight.w500,
            color: isTotal
                ? AppColors.primary
                : context.onSurfaceColor,
          ),
        ),
      ],
    );
  }
}
