import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/cart_bloc.dart';
import '../bloc/cart_state.dart';
import '../widgets/cart_item_tile.dart';
import '../../domain/entities/cart_item_entity.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/seller_avatar.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  // Selected product IDs (initialised to all on first build)
  final Set<String> _selected = {};
  bool _initialised = false;

  // Per-seller promo: key = sellerId key, value = applied discount amount
  final Map<String, TextEditingController> _promoCtrls = {};
  final Map<String, double> _sellerDiscounts = {};
  final Map<String, String?> _promoErrors = {};

  @override
  void dispose() {
    for (final c in _promoCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _ctrlFor(String sellerKey) =>
      _promoCtrls.putIfAbsent(sellerKey, () => TextEditingController());

  void _applyPromo(String sellerKey, List<CartItemEntity> sellerItems) {
    final code = _ctrlFor(sellerKey).text.trim().toUpperCase();
    final sellerSubtotal =
        sellerItems.fold<double>(0, (s, i) => s + i.subtotal);
    double discount = 0;
    String? error;

    if (code == 'SAVE10') {
      discount = sellerSubtotal * 0.1;
    } else if (code == 'SAVE20') {
      discount = sellerSubtotal * 0.2;
    } else {
      error = 'Invalid promo code';
    }

    setState(() {
      _sellerDiscounts[sellerKey] = discount;
      _promoErrors[sellerKey] = error;
    });

    if (error == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Promo applied: \$${discount.toStringAsFixed(2)} off for this store'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _toggleItem(String productId) {
    setState(() {
      if (_selected.contains(productId)) {
        _selected.remove(productId);
      } else {
        _selected.add(productId);
      }
    });
  }

  void _toggleSeller(String sellerKey, List<CartItemEntity> items) {
    final allSelected = items.every((i) => _selected.contains(i.product.id));
    setState(() {
      if (allSelected) {
        for (final i in items) {
          _selected.remove(i.product.id);
        }
      } else {
        for (final i in items) {
          _selected.add(i.product.id);
        }
      }
    });
  }

  // Subtotal of selected items only
  double _selectedSubtotal(List<CartItemEntity> all) =>
      all.where((i) => _selected.contains(i.product.id)).fold(
            0,
            (s, i) => s + i.subtotal,
          );

  // Total discount across all sellers (only for selected items)
  double _totalDiscount(Map<String, List<CartItemEntity>> groups) {
    double total = 0;
    for (final entry in groups.entries) {
      final selectedInGroup =
          entry.value.where((i) => _selected.contains(i.product.id)).toList();
      if (selectedInGroup.isEmpty) continue;
      final discount = _sellerDiscounts[entry.key] ?? 0;
      // Scale discount proportionally to selected items if partial selection
      final groupSubtotal =
          entry.value.fold<double>(0, (s, i) => s + i.subtotal);
      final selectedGroupSubtotal =
          selectedInGroup.fold<double>(0, (s, i) => s + i.subtotal);
      final ratio =
          groupSubtotal > 0 ? selectedGroupSubtotal / groupSubtotal : 0;
      total += discount * ratio;
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.cart),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<CartBloc, CartState>(
        builder: (context, state) {
          if (state.items.isEmpty) {
            return EmptyWidget(
              message: AppStrings.emptyCart,
              icon: Icons.shopping_cart_outlined,
              actionLabel: 'Browse Products',
              onAction: () => context.go('/'),
            );
          }

          // Init all selected on first build
          if (!_initialised) {
            _selected.addAll(state.items.map((i) => i.product.id));
            _initialised = true;
          }

          // Group items by seller
          final sellerGroups = <String, List<CartItemEntity>>{};
          for (final item in state.items) {
            final key = item.product.sellerId ?? '__unknown__';
            sellerGroups.putIfAbsent(key, () => []);
            sellerGroups[key]!.add(item);
          }

          final sellerNames = <String, String?>{
            for (final entry in sellerGroups.entries)
              entry.key: entry.value.first.product.sellerName,
          };

          final selectedSubtotal = _selectedSubtotal(state.items);
          final totalDiscount = _totalDiscount(sellerGroups);
          final afterDiscount = (selectedSubtotal - totalDiscount).clamp(0, double.infinity);
          final shipping = selectedSubtotal == 0
              ? 0.0
              : afterDiscount >= 50
                  ? 0.0
                  : 9.99;
          final tax = afterDiscount * 0.08;
          final total = afterDiscount + shipping + tax;
          final selectedCount =
              state.items.where((i) => _selected.contains(i.product.id)).length;

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(AppSizes.md),
                  children: [
                    for (final entry in sellerGroups.entries) ...[
                      _SellerGroupHeader(
                        sellerKey: entry.key,
                        sellerName: sellerNames[entry.key],
                        items: entry.value,
                        selected: _selected,
                        onToggleAll: () =>
                            _toggleSeller(entry.key, entry.value),
                      ),
                      ...entry.value.map(
                        (item) => _SelectableItemTile(
                          item: item,
                          isSelected: _selected.contains(item.product.id),
                          onToggle: () => _toggleItem(item.product.id),
                        ),
                      ),
                      _SellerPromoRow(
                        sellerKey: entry.key,
                        controller: _ctrlFor(entry.key),
                        discount: _sellerDiscounts[entry.key] ?? 0,
                        error: _promoErrors[entry.key],
                        onApply: () => _applyPromo(entry.key, entry.value),
                      ),
                      const SizedBox(height: AppSizes.sm),
                    ],
                    const SizedBox(height: AppSizes.xs),
                    // Order summary
                    _OrderSummary(
                      subtotal: selectedSubtotal,
                      discount: totalDiscount,
                      shipping: shipping,
                      tax: tax,
                      total: total,
                    ),
                    const SizedBox(height: AppSizes.md),
                  ],
                ),
              ),
              // Checkout bar
              _CheckoutBar(
                selectedCount: selectedCount,
                total: total,
                onCheckout: selectedCount == 0
                    ? null
                    : () => context.push('/checkout'),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Seller group header with "select all" checkbox ────────────────────────────

class _SellerGroupHeader extends StatelessWidget {
  final String sellerKey;
  final String? sellerName;
  final List<CartItemEntity> items;
  final Set<String> selected;
  final VoidCallback onToggleAll;

  const _SellerGroupHeader({
    required this.sellerKey,
    required this.sellerName,
    required this.items,
    required this.selected,
    required this.onToggleAll,
  });

  @override
  Widget build(BuildContext context) {
    final name = sellerName?.isNotEmpty == true ? sellerName! : 'Store';
    final allSelected = items.every((i) => selected.contains(i.product.id));
    final someSelected =
        !allSelected && items.any((i) => selected.contains(i.product.id));

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSizes.xs),
      child: Row(
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: Checkbox(
              value: allSelected ? true : (someSelected ? null : false),
              tristate: true,
              activeColor: AppColors.primary,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              onChanged: (_) => onToggleAll(),
            ),
          ),
          const SizedBox(width: 8),
          SellerAvatar(name: name, size: 20),
          const SizedBox(width: 6),
          Text(
            name,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: context.onSurfaceColor,
            ),
          ),
          const SizedBox(width: 4),
          Icon(Icons.storefront_outlined,
              size: 14, color: context.onSurfaceMuted),
        ],
      ),
    );
  }
}

// ── Selectable item tile (checkbox + CartItemTile) ────────────────────────────

class _SelectableItemTile extends StatelessWidget {
  final CartItemEntity item;
  final bool isSelected;
  final VoidCallback onToggle;

  const _SelectableItemTile({
    required this.item,
    required this.isSelected,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: 24,
          height: 24,
          child: Checkbox(
            value: isSelected,
            activeColor: AppColors.primary,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            onChanged: (_) => onToggle(),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Opacity(
            opacity: isSelected ? 1.0 : 0.45,
            child: CartItemTile(item: item),
          ),
        ),
      ],
    );
  }
}

// ── Per-seller promo code row ─────────────────────────────────────────────────

class _SellerPromoRow extends StatelessWidget {
  final String sellerKey;
  final TextEditingController controller;
  final double discount;
  final String? error;
  final VoidCallback onApply;

  const _SellerPromoRow({
    required this.sellerKey,
    required this.controller,
    required this.discount,
    required this.error,
    required this.onApply,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 30, bottom: AppSizes.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.md, vertical: 6),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(AppSizes.radiusLg),
              border: Border.all(color: context.borderColor),
            ),
            child: Row(
              children: [
                Icon(Icons.local_offer_outlined,
                    size: 16, color: context.onSurfaceMuted),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: controller,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      hintText: 'Promo code for this store',
                      hintStyle: TextStyle(
                          fontSize: 13, color: context.onSurfaceMuted),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      isDense: true,
                      filled: true,
                      fillColor: Colors.transparent,
                    ),
                    style: TextStyle(
                        fontSize: 13, color: context.onSurfaceColor),
                    onSubmitted: (_) => onApply(),
                  ),
                ),
                if (discount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.success.withAlpha(20),
                      borderRadius:
                          BorderRadius.circular(AppSizes.radiusFull),
                    ),
                    child: Text(
                      '-\$${discount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.success,
                      ),
                    ),
                  ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: onApply,
                  child: const Text(
                    'Apply',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 4, left: 4),
              child: Text(
                error!,
                style: const TextStyle(
                    fontSize: 11, color: AppColors.danger),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Order summary card ────────────────────────────────────────────────────────

class _OrderSummary extends StatelessWidget {
  final double subtotal;
  final double discount;
  final double shipping;
  final double tax;
  final double total;

  const _OrderSummary({
    required this.subtotal,
    required this.discount,
    required this.shipping,
    required this.tax,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSizes.md),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withAlpha(6),
              blurRadius: 10,
              offset: const Offset(0, 2))
        ],
      ),
      child: Column(
        children: [
          _SummaryRow('Order Amount', '\$${subtotal.toStringAsFixed(2)}'),
          if (discount > 0) ...[
            const SizedBox(height: AppSizes.sm),
            _SummaryRow(
              'Promo Discount',
              '-\$${discount.toStringAsFixed(2)}',
              valueColor: AppColors.success,
            ),
          ],
          const SizedBox(height: AppSizes.sm),
          _SummaryRow(
            AppStrings.shipping,
            shipping == 0
                ? AppStrings.freeShipping
                : '\$${shipping.toStringAsFixed(2)}',
            valueColor: shipping == 0 ? AppColors.success : null,
          ),
          const SizedBox(height: AppSizes.sm),
          _SummaryRow('Tax (8%)', '\$${tax.toStringAsFixed(2)}'),
          const SizedBox(height: AppSizes.sm),
          const Divider(height: 1),
          const SizedBox(height: AppSizes.sm),
          _SummaryRow(
            'Total Payment',
            '\$${total.toStringAsFixed(2)}',
            bold: true,
          ),
        ],
      ),
    );
  }
}

// ── Checkout bar ──────────────────────────────────────────────────────────────

class _CheckoutBar extends StatelessWidget {
  final int selectedCount;
  final double total;
  final VoidCallback? onCheckout;

  const _CheckoutBar({
    required this.selectedCount,
    required this.total,
    required this.onCheckout,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: context.surfaceColor,
      padding: EdgeInsets.fromLTRB(
        AppSizes.md,
        AppSizes.sm,
        AppSizes.md,
        MediaQuery.of(context).padding.bottom + AppSizes.sm,
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$selectedCount item${selectedCount != 1 ? 's' : ''} selected',
                style: TextStyle(
                  fontSize: 12,
                  color: context.onSurfaceSecondary,
                ),
              ),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
          const SizedBox(width: AppSizes.md),
          Expanded(
            child: ElevatedButton(
              onPressed: onCheckout,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(0, AppSizes.buttonHeight),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                ),
                backgroundColor: onCheckout != null
                    ? AppColors.darkButton
                    : AppColors.textMuted,
              ),
              child: Text(
                onCheckout != null
                    ? AppStrings.checkout
                    : 'Select items',
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Summary row ───────────────────────────────────────────────────────────────

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  const _SummaryRow(this.label, this.value,
      {this.bold = false, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: context.onSurfaceSecondary,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            fontSize: bold ? 15 : 14,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? context.onSurfaceColor,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: bold ? 16 : 14,
          ),
        ),
      ],
    );
  }
}
