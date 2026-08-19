import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../keys.dart';
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
import '../../../voucher/presentation/select_voucher_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final Set<String> _selected = {};
  bool _initialised = false;
  // Per-seller delivery option selection (only relevant for buyer_pays sellers)
  final Map<String, String> _deliverySelections = {};
  // Per-seller voucher discounts (code → discountAmount)
  final Map<String, VoucherSelection> _voucherSelections = {};

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

  // Effective price after variant or product-level percentage discount
  double _effectivePrice(CartItemEntity item) {
    final v = item.selectedVariant;
    if (v != null) {
      final disc = v.discount;
      return disc != null && disc > 0 ? v.price * (1 - disc / 100) : v.price;
    }
    final disc = item.product.discount;
    if (disc == null || disc <= 0) return item.product.price;
    return item.product.price * (1 - disc / 100);
  }

  double _selectedSubtotal(List<CartItemEntity> all) =>
      all.where((i) => _selected.contains(i.product.id)).fold(
            0,
            (s, i) => s + _effectivePrice(i) * i.quantity,
          );

  // Total discount across selected items (variant or product level)
  double _totalDiscount(List<CartItemEntity> all) {
    return all.where((i) => _selected.contains(i.product.id)).fold(0.0, (s, i) {
      final v = i.selectedVariant;
      if (v != null) {
        final disc = v.discount;
        if (disc == null || disc <= 0) return s;
        return s + (v.price - _effectivePrice(i)) * i.quantity;
      }
      final disc = i.product.discount;
      if (disc == null || disc <= 0) return s;
      return s + (i.product.price - _effectivePrice(i)) * i.quantity;
    });
  }

  Future<void> _openVoucherScreen(
      String sellerKey, String sellerName, double orderAmount) async {
    final result = await Navigator.of(context).push<VoucherSelection>(
      MaterialPageRoute(
        builder: (_) => SelectVoucherScreen(
          sellerId: sellerKey,
          sellerName: sellerName,
          orderAmount: orderAmount,
          currentCode: _voucherSelections[sellerKey]?.code,
        ),
      ),
    );
    if (!mounted) return;
    setState(() {
      if (result == null) {
        _voucherSelections.remove(sellerKey);
      } else {
        _voucherSelections[sellerKey] = result;
      }
    });
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
              actionLabel: AppStrings.browseProducts,
              onAction: () => context.go('/'),
            );
          }

          if (!_initialised) {
            _selected.addAll(state.items.map((i) => i.product.id));
            _initialised = true;
          }

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
          final totalProductDiscount = _totalDiscount(state.items);
          final totalVoucherDiscount = _voucherSelections.entries
              .where((e) => sellerGroups.containsKey(e.key))
              .fold<double>(0, (s, e) => s + e.value.discountAmount);
          final afterDiscount = (selectedSubtotal - totalVoucherDiscount)
              .clamp(0.0, double.infinity);

          final sellerSummaries = <String,
              ({
            double subtotal,
            double discount,
            double voucherDiscount,
            double shipping,
            double tax,
            List<String> shippingOptions,
          })>{};
          double shipping = 0;
          if (selectedSubtotal > 0) {
            for (final entry in sellerGroups.entries) {
              final sellerSelected = entry.value
                  .where((i) => _selected.contains(i.product.id))
                  .toList();
              if (sellerSelected.isEmpty) continue;
              final sub = sellerSelected.fold<double>(
                  0, (s, i) => s + _effectivePrice(i) * i.quantity);
              final disc = sellerSelected.fold<double>(
                0,
                (s, i) => s + (i.rawPrice - _effectivePrice(i)) * i.quantity,
              );
              final voucherDisc =
                  _voucherSelections[entry.key]?.discountAmount ?? 0.0;
              final after = (sub - voucherDisc).clamp(0.0, double.infinity);

              // Collect delivery options across seller's selected items
              final opts = <String>[];
              for (final i in sellerSelected) {
                for (final opt in i.product.shippingOptions) {
                  if (!opts.contains(opt)) opts.add(opt);
                }
              }

              // Determine shipping based on seller's configured fee
              final sellerShippingFee =
                  sellerSelected.first.product.shippingFee;
              final double ship;
              if (sellerShippingFee == 'free') {
                ship = 0.0;
              } else if (sellerShippingFee == 'buyer_pays') {
                // Use selected delivery option fee if available
                final selectedOpt =
                    _deliverySelections[entry.key] ?? opts.firstOrNull;
                final feeAmounts =
                    sellerSelected.first.product.shippingFeeAmounts;
                if (selectedOpt != null &&
                    feeAmounts.containsKey(selectedOpt)) {
                  ship = feeAmounts[selectedOpt]!;
                } else {
                  ship = -1.0; // sentinel: unknown
                }
              } else {
                ship = -1.0; // no shipping config set by seller — resolved at checkout
              }
              if (ship >= 0) shipping += ship;
              final sellerTax = after * 0.08;
              sellerSummaries[entry.key] = (
                subtotal: sub,
                discount: disc,
                voucherDiscount: voucherDisc,
                shipping: ship,
                tax: sellerTax,
                shippingOptions: opts,
              );
            }
          }

          final tax = afterDiscount * 0.08;
          final total = afterDiscount + shipping + tax;
          final selectedCount =
              state.items.where((i) => _selected.contains(i.product.id)).length;
          final multiSeller = sellerGroups.length > 1;

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(
                      AppSizes.md, AppSizes.sm, AppSizes.md, AppSizes.md),
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
                      const SizedBox(height: AppSizes.xs),
                      ...entry.value.map(
                        (item) => _SelectableItemTile(
                          item: item,
                          isSelected: _selected.contains(item.product.id),
                          onToggle: () => _toggleItem(item.product.id),
                        ),
                      ),
                      if (sellerSummaries.containsKey(entry.key)) ...[
                        if (sellerSummaries[entry.key]!
                                    .shippingOptions
                                    .isNotEmpty &&
                                sellerSummaries[entry.key]!.shipping != 0 ||
                            sellerSummaries[entry.key]!.shipping == -1.0)
                          _DeliveryOptionSelector(
                            sellerKey: entry.key,
                            options:
                                sellerSummaries[entry.key]!.shippingOptions,
                            feeAmounts:
                                entry.value.first.product.shippingFeeAmounts,
                            selected: _deliverySelections[entry.key] ??
                                sellerSummaries[entry.key]!
                                    .shippingOptions
                                    .firstOrNull,
                            onSelect: (opt) => setState(
                                () => _deliverySelections[entry.key] = opt),
                          ),
                        const SizedBox(height: AppSizes.xs),
                        _VoucherRow(
                          voucher: _voucherSelections[entry.key],
                          onTap: () => _openVoucherScreen(
                            entry.key,
                            sellerNames[entry.key] ?? 'Store',
                            sellerSummaries[entry.key]!.subtotal,
                          ),
                        ),
                        if (multiSeller)
                          _SellerSummaryCard(
                            sellerName: sellerNames[entry.key] ?? 'Store',
                            subtotal: sellerSummaries[entry.key]!.subtotal,
                            productDiscount:
                                sellerSummaries[entry.key]!.discount,
                            voucherDiscount:
                                sellerSummaries[entry.key]!.voucherDiscount,
                            shipping: sellerSummaries[entry.key]!.shipping,
                            tax: sellerSummaries[entry.key]!.tax,
                          ),
                      ],
                      const SizedBox(height: AppSizes.sm),
                    ],
                    const SizedBox(height: AppSizes.xs),
                    _OrderSummary(
                      subtotal: selectedSubtotal + totalProductDiscount,
                      productDiscount: totalProductDiscount,
                      voucherDiscount: totalVoucherDiscount,
                      shipping: shipping,
                      tax: tax,
                      total: total,
                    ),
                    const SizedBox(height: AppSizes.md),
                  ],
                ),
              ),
              _CheckoutBar(
                selectedCount: selectedCount,
                total: total,
                onCheckout: selectedCount == 0
                    ? null
                    : () => context.push('/checkout', extra: {
                          'selected': Set<String>.from(_selected),
                          'deliverySelections':
                              Map<String, String>.from(_deliverySelections),
                          'voucherSelections':
                              Map<String, VoucherSelection>.from(
                                  _voucherSelections),
                        }),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Seller group header ───────────────────────────────────────────────────────

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
    final itemCount = items.fold<int>(0, (s, i) => s + i.quantity);

    return Container(
      padding: const EdgeInsets.only(
          right: AppSizes.md, top: AppSizes.sm, bottom: AppSizes.sm),
      decoration: BoxDecoration(
        color: context.surfaceVariantColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
      ),
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
          SellerAvatar(name: name, size: 22),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: context.onSurfaceColor,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(18),
              borderRadius: BorderRadius.circular(AppSizes.radiusFull),
            ),
            child: Text(
              '$itemCount item${itemCount != 1 ? 's' : ''}',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Selectable item tile ──────────────────────────────────────────────────────

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

// ── Per-seller summary (only shown for multi-seller carts) ────────────────────

class _SellerSummaryCard extends StatelessWidget {
  final String sellerName;
  final double subtotal;
  final double productDiscount;
  final double voucherDiscount;
  final double shipping;
  final double tax;

  const _SellerSummaryCard({
    required this.sellerName,
    required this.subtotal,
    required this.productDiscount,
    required this.voucherDiscount,
    required this.shipping,
    required this.tax,
  });

  @override
  Widget build(BuildContext context) {
    // subtotal is already effective (product discount baked in); only subtract voucher
    final afterDiscount =
        (subtotal - voucherDiscount).clamp(0.0, double.infinity);
    final storeTotal = afterDiscount + shipping + tax;
    return Container(
      margin: const EdgeInsets.only(bottom: AppSizes.xs),
      padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.md, vertical: AppSizes.sm),
      decoration: BoxDecoration(
        color: context.surfaceVariantColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.storefront_outlined,
                  size: 14, color: context.onSurfaceMuted),
              const SizedBox(width: 6),
              Text(
                sellerName,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: context.onSurfaceSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _SummaryRow(AppStrings.orderAmount,
              '\$${(subtotal + productDiscount).toStringAsFixed(2)}'),
          if (productDiscount > 0) ...[
            const SizedBox(height: 4),
            _SummaryRow(
              AppStrings.discount,
              '-\$${productDiscount.toStringAsFixed(2)}',
              valueColor: AppColors.success,
            ),
          ],
          if (voucherDiscount > 0) ...[
            const SizedBox(height: 4),
            _SummaryRow(
              'Voucher Savings',
              '-\$${voucherDiscount.toStringAsFixed(2)}',
              valueColor: AppColors.success,
            ),
          ],
          const SizedBox(height: 4),
          _SummaryRow(
            AppStrings.shipping,
            shipping < 0
                ? 'At checkout'
                : (shipping == 0
                    ? AppStrings.freeShipping
                    : '\$${shipping.toStringAsFixed(2)}'),
            valueColor: shipping < 0
                ? null
                : (shipping == 0 ? AppColors.success : null),
            muted: shipping < 0,
          ),
          const SizedBox(height: 4),
          _SummaryRow(AppStrings.taxLabel, '\$${tax.toStringAsFixed(2)}'),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: Divider(height: 1),
          ),
          _SummaryRow(
            shipping < 0 ? 'Subtotal + Tax' : AppStrings.storeTotal,
            '\$${storeTotal.toStringAsFixed(2)}',
            bold: true,
          ),
        ],
      ),
    );
  }
}

// ── Order summary card ────────────────────────────────────────────────────────

class _OrderSummary extends StatelessWidget {
  final double subtotal;
  final double productDiscount;
  final double voucherDiscount;
  final double shipping;
  final double tax;
  final double total;

  const _OrderSummary({
    required this.subtotal,
    required this.productDiscount,
    required this.voucherDiscount,
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
              color: Colors.black.withAlpha(8),
              blurRadius: 12,
              offset: const Offset(0, 2)),
          BoxShadow(
              color: Colors.black.withAlpha(4),
              blurRadius: 4,
              offset: const Offset(0, 1)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.receipt_long_outlined,
                  size: 17, color: AppColors.primary),
              const SizedBox(width: 7),
              Text(
                AppStrings.orderSummary,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSizes.sm),
          const Divider(height: 1),
          const SizedBox(height: AppSizes.sm),
          _SummaryRow(
              AppStrings.orderAmount, '\$${subtotal.toStringAsFixed(2)}'),
          if (productDiscount > 0) ...[
            const SizedBox(height: AppSizes.sm),
            _SummaryRow(
              AppStrings.discount,
              '-\$${productDiscount.toStringAsFixed(2)}',
              valueColor: AppColors.success,
            ),
          ],
          if (voucherDiscount > 0) ...[
            const SizedBox(height: AppSizes.sm),
            _SummaryRow(
              'Voucher Savings',
              '-\$${voucherDiscount.toStringAsFixed(2)}',
              valueColor: AppColors.success,
            ),
          ],
          const SizedBox(height: AppSizes.sm),
          _SummaryRow(
            AppStrings.shipping,
            shipping < 0
                ? 'At checkout'
                : (shipping == 0
                    ? AppStrings.freeShipping
                    : '\$${shipping.toStringAsFixed(2)}'),
            valueColor: shipping < 0
                ? null
                : (shipping == 0 ? AppColors.success : null),
            muted: shipping < 0,
          ),
          const SizedBox(height: AppSizes.sm),
          _SummaryRow(AppStrings.taxLabel, '\$${tax.toStringAsFixed(2)}'),
          const SizedBox(height: AppSizes.sm),
          const Divider(height: 1),
          const SizedBox(height: AppSizes.sm),
          _SummaryRow(
            shipping < 0 ? 'Total Payment*' : AppStrings.totalPayment,
            '\$${total.toStringAsFixed(2)}',
            bold: true,
            valueColor: AppColors.primary,
          ),
          if (shipping < 0) ...[
            const SizedBox(height: 4),
            Text(
              '* Excl. shipping, calculated at checkout',
              style: TextStyle(
                  fontSize: 10,
                  color: context.onSurfaceMuted,
                  fontStyle: FontStyle.italic),
            ),
          ],
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
      decoration: BoxDecoration(
        color: context.surfaceColor,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(12),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
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
                  fontSize: 11,
                  color: context.onSurfaceSecondary,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
          const SizedBox(width: AppSizes.md),
          Expanded(
            child: ElevatedButton(
              key: keys.cart.checkoutButton,
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
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    onCheckout != null
                        ? AppStrings.checkout
                        : AppStrings.selectItems,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  if (onCheckout != null) ...[
                    const SizedBox(width: 6),
                    const Icon(Icons.arrow_forward_rounded, size: 16),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Voucher row ───────────────────────────────────────────────────────────────

class _VoucherRow extends StatelessWidget {
  final VoucherSelection? voucher;
  final VoidCallback onTap;

  const _VoucherRow({required this.voucher, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSizes.md, vertical: AppSizes.sm),
        decoration: BoxDecoration(
          color: context.surfaceVariantColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.4),
            style: BorderStyle.solid,
          ),
        ),
        child: Row(
          children: [
            const Icon(Icons.local_activity_outlined,
                size: 16, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                voucher != null
                    ? 'Voucher: ${voucher!.code}'
                    : 'Apply Shop Voucher',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (voucher != null)
              Text(
                '-\$${voucher!.discountAmount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              )
            else
              const Icon(Icons.chevron_right,
                  size: 18, color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}

// ── Delivery option selector (for buyer_pays sellers) ────────────────────────

class _DeliveryOptionSelector extends StatelessWidget {
  final String sellerKey;
  final List<String> options;
  final Map<String, double> feeAmounts;
  final String? selected;
  final void Function(String) onSelect;

  const _DeliveryOptionSelector({
    required this.sellerKey,
    required this.options,
    required this.feeAmounts,
    required this.selected,
    required this.onSelect,
  });

  String _label(String opt) {
    switch (opt) {
      case 'standard':
        return 'Standard';
      case 'express':
        return 'Express';
      case 'pickup':
        return 'Pickup';
      default:
        return opt[0].toUpperCase() + opt.substring(1);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (options.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(bottom: AppSizes.xs),
      padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.md, vertical: AppSizes.sm),
      decoration: BoxDecoration(
        color: context.surfaceVariantColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.local_shipping_outlined,
                  size: 14, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                'Delivery Option',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: options.map((opt) {
              final isSelected = selected == opt;
              final fee = feeAmounts[opt];
              return GestureDetector(
                onTap: () => onSelect(opt),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withAlpha(18)
                        : context.surfaceColor,
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : context.onSurfaceMuted.withAlpha(60),
                      width: isSelected ? 1.5 : 1,
                    ),
                    borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isSelected) ...[
                        const Icon(Icons.check_circle_rounded,
                            size: 13, color: AppColors.primary),
                        const SizedBox(width: 4),
                      ],
                      Text(
                        _label(opt),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected
                              ? AppColors.primary
                              : context.onSurfaceSecondary,
                        ),
                      ),
                      if (fee != null) ...[
                        const SizedBox(width: 4),
                        Text(
                          fee == 0 ? 'FREE' : '\$${fee.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: fee == 0
                                ? AppColors.success
                                : context.onSurfaceMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }).toList(),
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
  final bool muted;

  const _SummaryRow(this.label, this.value,
      {this.bold = false, this.valueColor, this.muted = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: bold ? context.onSurfaceColor : context.onSurfaceSecondary,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            fontSize: bold ? 15 : 13,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: muted
                ? context.onSurfaceMuted
                : (valueColor ?? context.onSurfaceColor),
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: muted ? 11 : (bold ? 16 : 13),
            fontStyle: muted ? FontStyle.italic : FontStyle.normal,
          ),
        ),
      ],
    );
  }
}
