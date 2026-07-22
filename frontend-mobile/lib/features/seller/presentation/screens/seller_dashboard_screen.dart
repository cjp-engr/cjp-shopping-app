import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../products/domain/entities/product_entity.dart';
import '../bloc/seller_bloc.dart';
import '../bloc/seller_event.dart';
import '../bloc/seller_state.dart';
import '../../../../shared/widgets/loading_widget.dart';

class SellerDashboardScreen extends StatefulWidget {
  const SellerDashboardScreen({super.key});

  @override
  State<SellerDashboardScreen> createState() => _SellerDashboardScreenState();
}

class _SellerDashboardScreenState extends State<SellerDashboardScreen> {
  String _categoryFilter = 'All';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SellerBloc>().add(const SellerProductsLoadRequested());
    });
  }

  void _confirmDelete(BuildContext context, ProductEntity product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
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
      appBar: AppBar(
        title: const Text('My Shop'),
      ),
      body: BlocConsumer<SellerBloc, SellerState>(
        listenWhen: (p, c) => p.status != c.status,
        listener: (context, state) {
          if (state.status == SellerStatus.failure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage ?? 'Something went wrong'),
                backgroundColor: AppColors.danger,
                duration: const Duration(seconds: 2),
              ),
            );
          }
        },
        builder: (context, state) {
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
          final filtered = _categoryFilter == 'All'
              ? state.products
              : state.products
                  .where((p) => p.category == _categoryFilter)
                  .toList();

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async {
              context
                  .read<SellerBloc>()
                  .add(const SellerProductsLoadRequested());
            },
            child: Column(
              children: [
                // ── Category filter chips ────────────────────────────────────
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
                      final isActive = cat == _categoryFilter;
                      final count = cat == 'All'
                          ? state.products.length
                          : state.products
                              .where((p) => p.category == cat)
                              .length;
                      return GestureDetector(
                        onTap: () => setState(() => _categoryFilter = cat),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: isActive
                                ? AppColors.primary
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(20),
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
                                  borderRadius: BorderRadius.circular(10),
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

                // ── Product list ─────────────────────────────────────────────
                Expanded(
                  child: filtered.isEmpty
                      ? Center(
                          child: Text(
                            'No products in this category.',
                            style: TextStyle(color: context.onSurfaceMuted),
                          ),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(AppSizes.md),
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
                              onDelete: () => _confirmDelete(context, product),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/seller/add'),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
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
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
          BoxShadow(
            color: Colors.black.withAlpha(5),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSizes.sm),
        child: Row(
          children: [
            // ── Product image ───────────────────────────────────────────────
            ClipRRect(
              borderRadius: BorderRadius.circular(AppSizes.radiusMd),
              child: product.image.isNotEmpty
                  ? Image.network(
                      product.image,
                      width: 72,
                      height: 72,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholder(),
                    )
                  : _placeholder(),
            ),
            const SizedBox(width: AppSizes.sm),

            // ── Info ────────────────────────────────────────────────────────
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
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
                  Text(
                    '\$${product.price.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 5),
                  _StockBadge(product: product),
                ],
              ),
            ),
            const SizedBox(width: AppSizes.xs),

            // ── Actions ─────────────────────────────────────────────────────
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _ActionIconBtn(
                  icon: Icons.edit_outlined,
                  color: AppColors.primary,
                  bgAlpha: 18,
                  onPressed: isSaving ? null : onEdit,
                  tooltip: 'Edit',
                ),
                const SizedBox(height: 6),
                _ActionIconBtn(
                  icon: Icons.delete_outline_rounded,
                  color: AppColors.danger,
                  bgAlpha: 18,
                  onPressed: isSaving ? null : onDelete,
                  tooltip: 'Delete',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: 72,
      height: 72,
      color: AppColors.surfaceVariant,
      child: const Icon(Icons.inventory_2_outlined, color: AppColors.textMuted),
    );
  }
}

// ── Action icon button ────────────────────────────────────────────────────────

class _ActionIconBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int bgAlpha;
  final VoidCallback? onPressed;
  final String tooltip;

  const _ActionIconBtn({
    required this.icon,
    required this.color,
    required this.bgAlpha,
    required this.tooltip,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onPressed,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: color.withAlpha(onPressed != null ? bgAlpha : 10),
            borderRadius: BorderRadius.circular(AppSizes.radiusSm),
          ),
          child: Icon(
            icon,
            size: 18,
            color: onPressed != null ? color : color.withAlpha(80),
          ),
        ),
      ),
    );
  }
}

// ── Stock badge ───────────────────────────────────────────────────────────────

class _StockBadge extends StatelessWidget {
  final ProductEntity product;
  const _StockBadge({required this.product});

  @override
  Widget build(BuildContext context) {
    final color = product.inStock ? AppColors.success : AppColors.danger;
    final label =
        product.inStock ? 'In Stock (${product.stock})' : 'Out of Stock';

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
