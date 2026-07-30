import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../products/domain/entities/product_entity.dart';
import '../../data/models/seller_order_model.dart';
import '../bloc/seller_bloc.dart';
import '../bloc/seller_event.dart';
import '../bloc/seller_state.dart';
import '../../../../shared/widgets/app_dialog.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../voucher/data/voucher_repository.dart';
import '../../../../core/constants/app_strings.dart';

class SellerDashboardScreen extends StatefulWidget {
  final String? initialTab;
  const SellerDashboardScreen({super.key, this.initialTab});

  @override
  State<SellerDashboardScreen> createState() => _SellerDashboardScreenState();
}

class _SellerDashboardScreenState extends State<SellerDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _categoryFilter = 'All';
  String _orderStatusFilter = 'all';
  bool _ordersRequested = false;

  // Voucher tab state
  VoucherRepository? _voucherRepo;
  List<VoucherModel> _coupons = [];
  bool _couponsLoading = false;
  bool _couponsRequested = false;

  @override
  void initState() {
    super.initState();
    final initialIndex = widget.initialTab == 'orders'
        ? 1
        : widget.initialTab == 'vouchers'
            ? 2
            : 0;
    _tabController =
        TabController(length: 3, vsync: this, initialIndex: initialIndex);
    _tabController.addListener(_onTabChanged);
    _initVoucherRepo();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SellerBloc>().add(const SellerProductsLoadRequested());
      // If opened directly on Orders tab (e.g. from a notification tap),
      // trigger the lazy load that _onTabChanged would normally handle.
      if (initialIndex == 1 && !_ordersRequested) {
        _ordersRequested = true;
        context.read<SellerBloc>().add(const SellerOrdersLoadRequested());
      }
    });
  }

  Future<void> _initVoucherRepo() async {
    try {
      final client = await ApiClient.get();
      if (!mounted) return;
      _voucherRepo = VoucherRepository(client);
    } catch (_) {}
  }

  void _onTabChanged() {
    if (_tabController.index == 1 && !_ordersRequested) {
      _ordersRequested = true;
      context.read<SellerBloc>().add(const SellerOrdersLoadRequested());
    }
    if (_tabController.index == 2 && !_couponsRequested) {
      _couponsRequested = true;
      _loadCoupons();
    }
  }

  Future<void> _loadCoupons() async {
    if (_voucherRepo == null) return;
    setState(() => _couponsLoading = true);
    final list = await _voucherRepo!.listMine();
    if (mounted) {
      setState(() {
        _coupons = list;
        _couponsLoading = false;
      });
    }
  }

  Future<void> _deleteCoupon(String id) async {
    if (_voucherRepo == null) return;
    await _voucherRepo!.delete(id);
    if (mounted) setState(() => _coupons.removeWhere((c) => c.id == id));
  }

  Future<void> _saveCoupon(Map<String, dynamic> data, {String? editId}) async {
    if (_voucherRepo == null) return;
    if (editId != null) {
      final updated = await _voucherRepo!.update(editId, data);
      if (mounted) {
        setState(() => _coupons =
            _coupons.map((c) => c.id == editId ? updated : c).toList());
      }
    } else {
      final created = await _voucherRepo!.create(data);
      if (mounted) setState(() => _coupons = [created, ..._coupons]);
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _showCouponForm(BuildContext context, {VoucherModel? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _CouponFormSheet(
        existing: existing,
        onSave: (data) => _saveCoupon(data, editId: existing?.id),
      ),
    );
  }

  void _confirmDelete(BuildContext context, ProductEntity product) async {
    final confirm = await AppDialog.show(
      context,
      icon: Icons.delete_outline_rounded,
      iconColor: AppColors.danger,
      iconBackground: AppColors.dangerSurface,
      title: AppStrings.deleteProduct,
      body:
          'Remove "${product.name}" from your shop? This action cannot be undone.',
      cancelLabel: AppStrings.keepIt,
      confirmLabel: AppStrings.yesDelete,
      confirmColor: AppColors.danger,
    );
    if (confirm == true && context.mounted) {
      context.read<SellerBloc>().add(SellerProductDeleteRequested(product.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bgColor,
      appBar: AppBar(
        backgroundColor: AppColors.bannerStart,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        title: const Text(
          AppStrings.sellerDashboard,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 18,
            color: Colors.white,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 20),
            tooltip: AppStrings.refresh,
            onPressed: () {
              context
                  .read<SellerBloc>()
                  .add(const SellerProductsLoadRequested());
              if (_ordersRequested) {
                context
                    .read<SellerBloc>()
                    .add(const SellerOrdersLoadRequested());
              }
            },
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
              text: AppStrings.myProducts,
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
                            borderRadius:
                                BorderRadius.circular(AppSizes.radiusFull),
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
            const Tab(
              icon: Icon(Icons.local_offer_outlined, size: 18),
              text: AppStrings.vouchers,
            ),
          ],
        ),
      ),
      body: BlocListener<SellerBloc, SellerState>(
        listenWhen: (p, c) =>
            (p.status != c.status && c.status == SellerStatus.failure) ||
            (p.ordersStatus != c.ordersStatus &&
                c.ordersStatus == SellerOrdersStatus.failure),
        listener: (context, state) {},
        child: Column(
          children: [
            // ── Stats row — rebuilds only when counts change ─────────────
            BlocBuilder<SellerBloc, SellerState>(
              buildWhen: (p, c) =>
                  p.products.length != c.products.length ||
                  p.activeOrderCount != c.activeOrderCount ||
                  p.pendingOrderCount != c.pendingOrderCount ||
                  p.revenue != c.revenue,
              builder: (_, state) => _StatsRow(state: state),
            ),

            // ── Tab content ──────────────────────────────────────────────
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Products tab — rebuilds only when products change
                  BlocBuilder<SellerBloc, SellerState>(
                    buildWhen: (p, c) =>
                        p.products != c.products || p.status != c.status,
                    builder: (context, state) => _ProductsTab(
                      state: state,
                      categoryFilter: _categoryFilter,
                      onCategoryChanged: (cat) =>
                          setState(() => _categoryFilter = cat),
                      onDelete: (p) => _confirmDelete(context, p),
                    ),
                  ),
                  // Orders tab — rebuilds only when orders change
                  BlocBuilder<SellerBloc, SellerState>(
                    buildWhen: (p, c) =>
                        p.orders != c.orders ||
                        p.ordersStatus != c.ordersStatus,
                    builder: (context, state) => _OrdersTab(
                      state: state,
                      statusFilter: _orderStatusFilter,
                      onStatusChanged: (s) =>
                          setState(() => _orderStatusFilter = s),
                    ),
                  ),
                  // Vouchers tab
                  _VouchersTab(
                    coupons: _coupons,
                    loading: _couponsLoading,
                    onDelete: _deleteCoupon,
                    onSave: _saveCoupon,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: ListenableBuilder(
        listenable: _tabController,
        builder: (context, _) {
          if (_tabController.index == 0) {
            return FloatingActionButton(
              onPressed: () => context.push('/seller/add'),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              child: const Icon(Icons.add),
            );
          }
          if (_tabController.index == 2) {
            return FloatingActionButton(
              onPressed: () => _showCouponForm(context),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              tooltip: AppStrings.createVoucher,
              child: const Icon(Icons.add),
            );
          }
          return const SizedBox.shrink();
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
            label: AppStrings.products,
          ),
          const SizedBox(width: AppSizes.sm),
          _StatCard(
            icon: Icons.inventory_2_rounded,
            iconBg: AppColors.warningSurface,
            iconColor: AppColors.warning,
            value: '${state.activeOrderCount}',
            label: AppStrings.active,
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
            label: AppStrings.revenue,
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
        message: AppStrings.noProductsListedYet,
        actionLabel: AppStrings.addProduct,
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
              separatorBuilder: (_, __) => const SizedBox(width: AppSizes.xs),
              itemBuilder: (context, i) {
                final cat = categories[i];
                final isActive = cat == categoryFilter;
                final count = cat == 'All'
                    ? state.products.length
                    : state.products.where((p) => p.category == cat).length;
                return GestureDetector(
                  onTap: () => onCategoryChanged(cat),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: isActive ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                      border: Border.all(
                        color: isActive ? AppColors.primary : AppColors.border,
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
                            color:
                                isActive ? Colors.white : AppColors.textMuted,
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
                            borderRadius:
                                BorderRadius.circular(AppSizes.radiusFull),
                          ),
                          child: Text(
                            '$count',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color:
                                  isActive ? Colors.white : AppColors.textMuted,
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
                      AppStrings.noProductsInCategory,
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
    _StatusTab('pending', AppStrings.statusPending, Icons.access_time_rounded),
    _StatusTab('preparing', AppStrings.statusPreparing,
        Icons.pending_actions_outlined),
    _StatusTab(
        'processing', AppStrings.statusToShip, Icons.inventory_2_outlined),
    _StatusTab(
        'shipped', AppStrings.statusToReceive, Icons.local_shipping_outlined),
    _StatusTab('delivered', AppStrings.stepDelivered,
        Icons.check_circle_outline_rounded),
    _StatusTab('cancelled', AppStrings.statusCancelled, Icons.cancel_outlined),
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
        message: AppStrings.noOrdersForProducts,
      );
    }

    final visibleTabs = _allTabs
        .where(
            (t) => t.key == 'all' || state.orders.any((o) => o.status == t.key))
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
                separatorBuilder: (_, __) => const SizedBox(width: AppSizes.xs),
                itemBuilder: (context, i) {
                  final tab = visibleTabs[i];
                  final isActive = tab.key == statusFilter;
                  final count = tab.key == 'all'
                      ? state.orders.length
                      : state.orders.where((o) => o.status == tab.key).length;
                  return GestureDetector(
                    onTap: () => onStatusChanged(tab.key),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color:
                            isActive ? AppColors.primary : Colors.transparent,
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusFull),
                        border: Border.all(
                          color:
                              isActive ? AppColors.primary : AppColors.border,
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
                              color:
                                  isActive ? Colors.white : AppColors.textMuted,
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
                              borderRadius:
                                  BorderRadius.circular(AppSizes.radiusFull),
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
                      AppStrings.noOrdersWithStatus,
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
                        borderRadius: BorderRadius.circular(AppSizes.radiusSm),
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
                                      fontSize: 12, color: AppColors.textMuted),
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
                    if (order.canMarkPreparing ||
                        order.canMarkToShip ||
                        order.canMarkShipped ||
                        order.canCancel) ...[
                      const SizedBox(height: 10),
                      Divider(height: 1, color: context.borderColor),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          if (order.canMarkPreparing)
                            Expanded(
                              child: _OrderActionBtn(
                                label: AppStrings.prepare,
                                icon: Icons.pending_actions_outlined,
                                color: AppColors.primary,
                                onTap: () => context.read<SellerBloc>().add(
                                    SellerOrderStatusUpdateRequested(
                                        order.id, 'preparing')),
                              ),
                            ),
                          if (order.canMarkToShip)
                            Expanded(
                              child: _OrderActionBtn(
                                label: AppStrings.markToShip,
                                icon: Icons.inventory_2_outlined,
                                color: AppColors.primary,
                                onTap: () => context.read<SellerBloc>().add(
                                    SellerOrderStatusUpdateRequested(
                                        order.id, 'processing')),
                              ),
                            ),
                          if (order.canMarkShipped)
                            Expanded(
                              child: _OrderActionBtn(
                                label: AppStrings.markShipped,
                                icon: Icons.local_shipping_outlined,
                                color: AppColors.primary,
                                onTap: () => context.read<SellerBloc>().add(
                                    SellerOrderStatusUpdateRequested(
                                        order.id, 'shipped')),
                              ),
                            ),
                          if ((order.canMarkPreparing ||
                                  order.canMarkToShip ||
                                  order.canMarkShipped) &&
                              order.canCancel)
                            const SizedBox(width: AppSizes.sm),
                          if (order.canCancel)
                            Expanded(
                              child: _OrderActionBtn(
                                label: 'Cancel',
                                icon: Icons.cancel_outlined,
                                color: AppColors.danger,
                                onTap: () =>
                                    _showSellerCancelDialog(context, order.id),
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

  void _showSellerCancelDialog(BuildContext context, String orderId) {
    String? reason;
    bool confirmed = false;
    final reasonValue = ValueNotifier<String>('');
    showDialog<void>(
      context: context,
      barrierColor: Colors.black54,
      builder: (dialogCtx) => AppFormDialog(
        icon: Icons.cancel_outlined,
        iconColor: AppColors.danger,
        iconBackground: AppColors.dangerSurface,
        title: AppStrings.cancelOrder,
        subtitle: AppStrings.cancelReasonSubtitle,
        formContent: _SellerCancelReasonField(value: reasonValue),
        cancelLabel: AppStrings.keepOrder,
        confirmLabel: AppStrings.yesCancel,
        confirmColor: AppColors.danger,
        onCancel: () => Navigator.of(dialogCtx).pop(),
        onConfirm: () {
          final text = reasonValue.value.trim();
          reason = text.isEmpty ? null : text;
          confirmed = true;
          Navigator.of(dialogCtx).pop();
        },
      ),
    ).then((_) {
      reasonValue.dispose();
      if (confirmed && context.mounted) {
        context.read<SellerBloc>().add(SellerOrderStatusUpdateRequested(
            orderId, 'cancelled',
            cancelReason: reason));
      }
    });
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
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
        'Dec'
      ];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return iso;
    }
  }

  _StatusConfig _statusConfig(String status) {
    switch (status) {
      case 'pending':
        return const _StatusConfig(AppStrings.statusPending, AppColors.warning);
      case 'preparing':
        return const _StatusConfig(
            AppStrings.statusPreparing, AppColors.warning);
      case 'processing':
        return const _StatusConfig(AppStrings.statusToShip, AppColors.primary);
      case 'shipped':
        return const _StatusConfig(
            AppStrings.statusToReceive, Color(0xFF6B7280));
      case 'delivered':
        return const _StatusConfig(AppStrings.stepDelivered, AppColors.success);
      case 'cancelled':
        return const _StatusConfig(
            AppStrings.statusCancelled, AppColors.danger);
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
                    cacheWidth: 84,
                    cacheHeight: 84,
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
                  style:
                      const TextStyle(fontSize: 11, color: AppColors.textMuted),
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
                          cacheWidth: 152,
                          cacheHeight: 152,
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
                        tooltip: AppStrings.edit,
                      ),
                      const SizedBox(height: 8),
                      _ActionIconBtn(
                        icon: Icons.delete_outline_rounded,
                        color: AppColors.danger,
                        bgColor: AppColors.dangerSurface,
                        onPressed: isSaving ? null : onDelete,
                        tooltip: AppStrings.delete,
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
        child:
            const Icon(Icons.inventory_2_outlined, color: AppColors.textMuted),
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
    final label = product.inStock ? 'Stock: ${product.stock}' : 'Out of Stock';

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
    final tax = order.tax > 0 ? order.tax : computedSubtotal * 0.08;
    final shipping =
        (order.shipping > 0 || computedSubtotal >= 50) ? order.shipping : 9.99;
    final total =
        order.total > 0 ? order.total : computedSubtotal + tax + shipping;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: context.bgColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
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
                                fontSize: 12, color: AppColors.textMuted),
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
                        title: AppStrings.buyer,
                        icon: Icons.person_outline_rounded,
                        child: InkWell(
                          onTap: order.buyer!.id.isNotEmpty
                              ? () {
                                  Navigator.of(context).pop();
                                  context.push('/users/${order.buyer!.id}');
                                }
                              : null,
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusMd),
                          child: Row(
                            children: [
                              _BuyerAvatar(
                                  name: order.buyer!.fullName, size: 48),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
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
                              Icon(Icons.chevron_right,
                                  size: 18, color: context.onSurfaceMuted),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSizes.sm),
                    ],

                    // ── Shipping address ────────────────────────────────────
                    if (addr != null && addr.formatted.isNotEmpty) ...[
                      _SheetSection(
                        title: AppStrings.shippingAddress,
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
                          final isLast = e.key == order.items.length - 1;
                          return Column(
                            children: [
                              _DetailItemRow(
                                item: e.value,
                                onTap: e.value.productId.isNotEmpty
                                    ? () {
                                        Navigator.of(context).pop();
                                        context.push(
                                            '/products/${e.value.productId}?hideEdit=1');
                                      }
                                    : null,
                              ),
                              if (!isLast) ...[
                                const SizedBox(height: 6),
                                Divider(height: 1, color: context.borderColor),
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
                      title: AppStrings.costBreakdown,
                      icon: Icons.receipt_outlined,
                      child: Column(
                        children: [
                          _SummaryLine(
                            label: AppStrings.subtotal,
                            value: '\$${computedSubtotal.toStringAsFixed(2)}',
                          ),
                          const SizedBox(height: 8),
                          _SummaryLine(
                            label: AppStrings.tax,
                            value: '\$${tax.toStringAsFixed(2)}',
                          ),
                          const SizedBox(height: 8),
                          _SummaryLine(
                            label: AppStrings.shipping,
                            value: shipping == 0
                                ? AppStrings.free
                                : '\$${shipping.toStringAsFixed(2)}',
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            child:
                                Divider(height: 1, color: context.borderColor),
                          ),
                          _SummaryLine(
                            label: AppStrings.total,
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
        return const _StatusConfig(AppStrings.statusPending, AppColors.warning);
      case 'preparing':
        return const _StatusConfig(
            AppStrings.statusPreparing, AppColors.warning);
      case 'processing':
        return const _StatusConfig(AppStrings.statusToShip, AppColors.primary);
      case 'shipped':
        return const _StatusConfig(
            AppStrings.statusToReceive, Color(0xFF6B7280));
      case 'delivered':
        return const _StatusConfig(AppStrings.stepDelivered, AppColors.success);
      case 'cancelled':
        return const _StatusConfig(
            AppStrings.statusCancelled, AppColors.danger);
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
  final VoidCallback? onTap;
  const _DetailItemRow({required this.item, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSizes.radiusMd),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppSizes.radiusSm),
            child: item.productImage.isNotEmpty
                ? Image.network(
                    item.productImage,
                    width: 50,
                    height: 50,
                    fit: BoxFit.cover,
                    cacheWidth: 100,
                    cacheHeight: 100,
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
                  style:
                      const TextStyle(fontSize: 12, color: AppColors.textMuted),
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
          if (onTap != null) ...[
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right,
                size: 16, color: AppColors.textMuted),
          ],
        ],
      ),
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

// ── Vouchers tab ─────────────────────────────────────────────────────────────

class _VouchersTab extends StatelessWidget {
  final List<VoucherModel> coupons;
  final bool loading;
  final Future<void> Function(String id) onDelete;
  final Future<void> Function(Map<String, dynamic> data, {String? editId})
      onSave;

  const _VouchersTab({
    required this.coupons,
    required this.loading,
    required this.onDelete,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (coupons.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_offer_outlined, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text(AppStrings.noVouchersYet,
                style: TextStyle(fontSize: 15, color: Colors.grey[500])),
            const SizedBox(height: 6),
            Text(AppStrings.tapToCreateVoucher,
                style: TextStyle(fontSize: 13, color: Colors.grey[400])),
          ],
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(AppSizes.md),
      itemCount: coupons.length,
      itemBuilder: (ctx, i) {
        final c = coupons[i];
        final daysLeft = c.daysLeft;
        final isExpired = c.isExpired;
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: ctx.surfaceColor,
            borderRadius: BorderRadius.circular(AppSizes.radiusMd),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(8),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: IntrinsicHeight(
            child: Row(
              children: [
                // Color strip
                Container(
                  width: 6,
                  decoration: BoxDecoration(
                    color: c.isActive && !isExpired
                        ? Colors.orange
                        : Colors.grey[300],
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(10),
                      bottomLeft: Radius.circular(10),
                    ),
                  ),
                ),
                // Icon
                Container(
                  width: 56,
                  color: c.isActive && !isExpired
                      ? Colors.orange.withValues(alpha: 0.08)
                      : Colors.grey.withValues(alpha: 0.05),
                  child: Center(
                    child: Icon(
                      Icons.local_offer_outlined,
                      size: 26,
                      color: c.isActive && !isExpired
                          ? Colors.orange
                          : Colors.grey[400],
                    ),
                  ),
                ),
                // Content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              c.code,
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                fontWeight: FontWeight.w800,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: c.isActive && !isExpired
                                    ? AppColors.success
                                    : Colors.grey,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                isExpired
                                    ? AppStrings.expired
                                    : (c.isActive
                                        ? AppStrings.active
                                        : AppStrings.inactive),
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          c.discountLabel,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                        if (c.description != null)
                          Text(c.description!,
                              style: TextStyle(
                                  fontSize: 11, color: Colors.grey[600])),
                        const SizedBox(height: 4),
                        Wrap(
                          spacing: 8,
                          children: [
                            if (c.minOrderAmount > 0)
                              Text(
                                  'Min \$${c.minOrderAmount.toStringAsFixed(2)}',
                                  style: TextStyle(
                                      fontSize: 11, color: Colors.grey[500])),
                            if (c.usageLimit != null)
                              Text('${c.usedCount}/${c.usageLimit} used',
                                  style: TextStyle(
                                      fontSize: 11, color: Colors.grey[500])),
                            if (daysLeft != null && !isExpired)
                              Text(
                                  '$daysLeft day${daysLeft != 1 ? 's' : ''} left',
                                  style: TextStyle(
                                      fontSize: 11, color: Colors.grey[500])),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                // Actions
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      color: AppColors.primary,
                      onPressed: () {
                        showModalBottomSheet(
                          context: ctx,
                          isScrollControlled: true,
                          shape: const RoundedRectangleBorder(
                            borderRadius:
                                BorderRadius.vertical(top: Radius.circular(20)),
                          ),
                          builder: (_) => _CouponFormSheet(
                            existing: c,
                            onSave: (data) => onSave(data, editId: c.id),
                          ),
                        );
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 18),
                      color: AppColors.danger,
                      onPressed: () => onDelete(c.id),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ── Coupon create/edit form sheet ─────────────────────────────────────────────

class _CouponFormSheet extends StatefulWidget {
  final VoucherModel? existing;
  final Future<void> Function(Map<String, dynamic> data) onSave;

  const _CouponFormSheet({this.existing, required this.onSave});

  @override
  State<_CouponFormSheet> createState() => _CouponFormSheetState();
}

class _CouponFormSheetState extends State<_CouponFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _codeCtrl = TextEditingController();
  final _valueCtrl = TextEditingController();
  final _maxDiscCtrl = TextEditingController();
  final _minAmtCtrl = TextEditingController();
  final _limitCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _discountType = 'percentage';
  bool _isActive = true;
  DateTime? _expiresAt;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final c = widget.existing;
    if (c != null) {
      _codeCtrl.text = c.code;
      _discountType = c.discountType;
      _valueCtrl.text = c.discountValue.toString();
      _maxDiscCtrl.text = c.maxDiscount?.toString() ?? '';
      _minAmtCtrl.text = c.minOrderAmount.toString();
      _limitCtrl.text = c.usageLimit?.toString() ?? '';
      _descCtrl.text = c.description ?? '';
      _isActive = c.isActive;
      _expiresAt = c.expiresAt != null ? DateTime.tryParse(c.expiresAt!) : null;
    }
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    _valueCtrl.dispose();
    _maxDiscCtrl.dispose();
    _minAmtCtrl.dispose();
    _limitCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final data = <String, dynamic>{
        'discountType': _discountType,
        'discountValue': double.parse(_valueCtrl.text),
        'minOrderAmount': double.tryParse(_minAmtCtrl.text) ?? 0,
        'isActive': _isActive,
        if (_descCtrl.text.trim().isNotEmpty)
          'description': _descCtrl.text.trim(),
        if (_maxDiscCtrl.text.trim().isNotEmpty)
          'maxDiscount': double.parse(_maxDiscCtrl.text),
        if (_limitCtrl.text.trim().isNotEmpty)
          'usageLimit': int.parse(_limitCtrl.text),
        if (_expiresAt != null) 'expiresAt': _expiresAt!.toIso8601String(),
      };
      if (widget.existing == null) {
        data['code'] = _codeCtrl.text.trim().toUpperCase();
      }
      await widget.onSave(data);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.existing != null
                        ? AppStrings.editVoucher
                        : AppStrings.createVoucher,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              if (_error != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_error!,
                      style: const TextStyle(
                          color: AppColors.danger, fontSize: 13)),
                ),
              if (widget.existing == null)
                _field(_codeCtrl, AppStrings.voucherCode,
                    hint: AppStrings.voucherCodeHint,
                    validator: (v) => v!.trim().isEmpty ? 'Required' : null),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _discountType,
                      decoration: _dec(AppStrings.discountType),
                      items: const [
                        DropdownMenuItem(
                            value: 'percentage',
                            child: Text(AppStrings.percentageOption)),
                        DropdownMenuItem(
                            value: 'fixed',
                            child: Text(AppStrings.fixedOption)),
                      ],
                      onChanged: (v) => setState(() => _discountType = v!),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _field(
                      _valueCtrl,
                      _discountType == 'percentage'
                          ? AppStrings.discountPercent
                          : AppStrings.discountAmount,
                      keyboardType: TextInputType.number,
                      validator: (v) => double.tryParse(v ?? '') == null
                          ? 'Invalid number'
                          : null,
                    ),
                  ),
                ],
              ),
              if (_discountType == 'percentage') ...[
                const SizedBox(height: 8),
                _field(_maxDiscCtrl, AppStrings.maxDiscountCap,
                    keyboardType: TextInputType.number),
              ],
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                      child: _field(_minAmtCtrl, AppStrings.minOrder,
                          keyboardType: TextInputType.number)),
                  const SizedBox(width: 10),
                  Expanded(
                      child: _field(_limitCtrl, AppStrings.usageLimit,
                          keyboardType: TextInputType.number)),
                ],
              ),
              const SizedBox(height: 8),
              _field(_descCtrl, AppStrings.descriptionOptional),
              const SizedBox(height: 8),
              // Expiry date picker
              GestureDetector(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _expiresAt ??
                        DateTime.now().add(const Duration(days: 30)),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
                  );
                  if (picked != null && mounted) {
                    setState(() => _expiresAt = picked);
                  }
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[400]!),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined,
                          size: 16, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Text(
                        _expiresAt != null
                            ? 'Expires: ${_expiresAt!.toLocal().toString().split(' ').first}'
                            : AppStrings.setExpiryDate,
                        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      ),
                      if (_expiresAt != null) ...[
                        const Spacer(),
                        GestureDetector(
                          onTap: () => setState(() => _expiresAt = null),
                          child: const Icon(Icons.close,
                              size: 16, color: Colors.grey),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              if (widget.existing != null) ...[
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text(AppStrings.active,
                      style: TextStyle(fontSize: 14)),
                  value: _isActive,
                  onChanged: (v) => setState(() => _isActive = v),
                  activeThumbColor: AppColors.primary,
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : Text(
                          widget.existing != null
                              ? AppStrings.saveChanges
                              : AppStrings.createVoucher,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController ctrl,
    String label, {
    String? hint,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) =>
      TextFormField(
        controller: ctrl,
        keyboardType: keyboardType,
        decoration: _dec(label, hint: hint),
        validator: validator,
        style: const TextStyle(fontSize: 13),
      );

  InputDecoration _dec(String label, {String? hint}) => InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: const TextStyle(fontSize: 13),
        hintStyle: TextStyle(fontSize: 12, color: Colors.grey[400]),
        isDense: true,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      );
}

class _SellerCancelReasonField extends StatefulWidget {
  const _SellerCancelReasonField({required this.value});
  final ValueNotifier<String> value;

  @override
  State<_SellerCancelReasonField> createState() =>
      _SellerCancelReasonFieldState();
}

class _SellerCancelReasonFieldState extends State<_SellerCancelReasonField> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController();
    _ctrl.addListener(() => widget.value.value = _ctrl.text);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return TextField(
      controller: _ctrl,
      maxLines: 3,
      style: TextStyle(
        fontSize: 14,
        color: isDark ? Colors.white : AppColors.textPrimary,
      ),
      decoration: InputDecoration(
        hintText: AppStrings.cancelReasonHint,
        hintStyle: TextStyle(
          fontSize: 13,
          color: isDark ? const Color(0xFF64748B) : AppColors.textMuted,
        ),
        helperText: AppStrings.cancelReasonHelper,
        helperStyle: TextStyle(
            fontSize: 12,
            color: isDark ? const Color(0xFF475569) : AppColors.textMuted),
        filled: true,
        fillColor: isDark ? const Color(0xFF0F172A) : AppColors.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }
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
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w400,
            color:
                isTotal ? context.onSurfaceColor : context.onSurfaceSecondary,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 16 : 13,
            fontWeight: isTotal ? FontWeight.w900 : FontWeight.w500,
            color: isTotal ? AppColors.primary : context.onSurfaceColor,
          ),
        ),
      ],
    );
  }
}
