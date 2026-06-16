import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/cart_bloc.dart';
import '../bloc/cart_state.dart';
import '../widgets/cart_item_tile.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/loading_widget.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.cart),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
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

          return Column(
            children: [
              // Free shipping progress
              if (!state.freeShipping)
                Container(
                  margin: const EdgeInsets.fromLTRB(
                      AppSizes.md, AppSizes.sm, AppSizes.md, 0),
                  padding: const EdgeInsets.all(AppSizes.sm),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Add \$${(50 - state.subtotal).toStringAsFixed(2)} more for free shipping',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF92400E),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusFull),
                        child: LinearProgressIndicator(
                          value: (state.subtotal / 50).clamp(0.0, 1.0),
                          minHeight: 6,
                          backgroundColor: const Color(0xFFFDE68A),
                          valueColor:
                              const AlwaysStoppedAnimation(AppColors.warning),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  margin: const EdgeInsets.fromLTRB(
                      AppSizes.md, AppSizes.sm, AppSizes.md, 0),
                  padding: const EdgeInsets.all(AppSizes.sm),
                  decoration: BoxDecoration(
                    color: const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                    border: Border.all(color: const Color(0xFF6EE7B7)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.local_shipping_outlined,
                          color: AppColors.success, size: 18),
                      SizedBox(width: AppSizes.sm),
                      Text(
                        'You have free shipping!',
                        style: TextStyle(
                          color: Color(0xFF064E3B),
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              // Items list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(AppSizes.md),
                  itemCount: state.items.length,
                  itemBuilder: (_, i) => CartItemTile(item: state.items[i]),
                ),
              ),
              // Order summary
              Container(
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  border: Border(top: BorderSide(color: AppColors.border)),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black12,
                        blurRadius: 12,
                        offset: Offset(0, -4))
                  ],
                ),
                padding: const EdgeInsets.all(AppSizes.md),
                child: Column(
                  children: [
                    _SummaryRow(AppStrings.subtotal,
                        '\$${state.subtotal.toStringAsFixed(2)}'),
                    const SizedBox(height: AppSizes.xs),
                    _SummaryRow(
                      AppStrings.shipping,
                      state.freeShipping
                          ? AppStrings.freeShipping
                          : '\$${state.shipping.toStringAsFixed(2)}',
                      valueColor: state.freeShipping ? AppColors.success : null,
                    ),
                    const SizedBox(height: AppSizes.xs),
                    _SummaryRow(
                        AppStrings.tax, '\$${state.tax.toStringAsFixed(2)}'),
                    const Divider(height: AppSizes.md),
                    _SummaryRow(
                      AppStrings.total,
                      '\$${state.total.toStringAsFixed(2)}',
                      bold: true,
                      valueColor: AppColors.primary,
                    ),
                    const SizedBox(height: AppSizes.md),
                    AppButton(
                      label: AppStrings.checkout,
                      icon: Icons.lock_outline,
                      onPressed: () => context.push('/checkout'),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

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
            color: bold ? AppColors.textPrimary : AppColors.textSecondary,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            fontSize: bold ? 16 : 14,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ??
                (bold ? AppColors.textPrimary : AppColors.textPrimary),
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: bold ? 17 : 14,
          ),
        ),
      ],
    );
  }
}
