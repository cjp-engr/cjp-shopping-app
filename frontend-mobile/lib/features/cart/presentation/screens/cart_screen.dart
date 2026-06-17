import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/cart_bloc.dart';
import '../bloc/cart_state.dart';
import '../widgets/cart_item_tile.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../shared/widgets/loading_widget.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _promoCtrl = TextEditingController();
  double _discount = 0;

  @override
  void dispose() {
    _promoCtrl.dispose();
    super.dispose();
  }

  void _applyPromo() {
    // Demo: promo code "SAVE10" gives 10% discount
    if (_promoCtrl.text.trim().toUpperCase() == 'SAVE10') {
      final state = context.read<CartBloc>().state;
      setState(() => _discount = state.subtotal * 0.1);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Promo applied: 10% off')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid promo code')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceVariant,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text(AppStrings.cart),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.shopping_bag_outlined),
            onPressed: () {},
          ),
        ],
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
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(AppSizes.md),
                  children: [
                    // Items
                    ...state.items
                        .map((item) => CartItemTile(item: item)),
                    const SizedBox(height: AppSizes.sm),
                    // Promo code
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: AppSizes.md, vertical: AppSizes.sm),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusLg),
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withAlpha(6),
                              blurRadius: 10,
                              offset: const Offset(0, 2))
                        ],
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _promoCtrl,
                              decoration: const InputDecoration(
                                hintText: 'Promo Code',
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                                fillColor: Colors.transparent,
                              ),
                              style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500),
                            ),
                          ),
                          ElevatedButton(
                            onPressed: _applyPromo,
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size(0, 44),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 20),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(
                                    AppSizes.radiusFull),
                              ),
                              backgroundColor: AppColors.darkButton,
                            ),
                            child: const Text('Apply',
                                style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSizes.sm),
                    // Order summary card
                    Container(
                      padding: const EdgeInsets.all(AppSizes.md),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusLg),
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withAlpha(6),
                              blurRadius: 10,
                              offset: const Offset(0, 2))
                        ],
                      ),
                      child: Column(
                        children: [
                          _SummaryRow(
                            'Order Amount',
                            '\$${state.subtotal.toStringAsFixed(2)}',
                          ),
                          const SizedBox(height: AppSizes.sm),
                          if (_discount > 0) ...[
                            _SummaryRow(
                              'Discount',
                              '-\$${_discount.toStringAsFixed(2)}',
                              valueColor: AppColors.success,
                            ),
                            const SizedBox(height: AppSizes.sm),
                          ],
                          _SummaryRow(
                            AppStrings.shipping,
                            state.freeShipping
                                ? AppStrings.freeShipping
                                : '\$${state.shipping.toStringAsFixed(2)}',
                            valueColor: state.freeShipping
                                ? AppColors.success
                                : null,
                          ),
                          const SizedBox(height: AppSizes.sm),
                          const Divider(height: 1),
                          const SizedBox(height: AppSizes.sm),
                          _SummaryRow(
                            'Total Payment',
                            '\$${(state.total - _discount).clamp(0, double.infinity).toStringAsFixed(2)}',
                            bold: true,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSizes.md),
                  ],
                ),
              ),
              // Checkout button
              Container(
                color: AppColors.surface,
                padding: EdgeInsets.fromLTRB(
                  AppSizes.md,
                  AppSizes.sm,
                  AppSizes.md,
                  MediaQuery.of(context).padding.bottom + AppSizes.sm,
                ),
                child: ElevatedButton(
                  onPressed: () => context.push('/checkout'),
                  style: ElevatedButton.styleFrom(
                    minimumSize:
                        const Size(double.infinity, AppSizes.buttonHeight),
                    shape: RoundedRectangleBorder(
                      borderRadius:
                          BorderRadius.circular(AppSizes.radiusFull),
                    ),
                    backgroundColor: AppColors.darkButton,
                  ),
                  child: const Text(
                    AppStrings.checkout,
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700),
                  ),
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
            color: AppColors.textSecondary,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
            fontSize: bold ? 15 : 14,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ??
                (bold ? AppColors.textPrimary : AppColors.textPrimary),
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: bold ? 16 : 14,
          ),
        ),
      ],
    );
  }
}
