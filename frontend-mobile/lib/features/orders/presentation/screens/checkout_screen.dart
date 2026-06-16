import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/order_bloc.dart';
import '../bloc/order_event.dart';
import '../bloc/order_state.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
import '../../../cart/presentation/bloc/cart_event.dart';
import '../../../cart/presentation/bloc/cart_state.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _streetCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();
  final _zipCtrl = TextEditingController();
  final _countryCtrl = TextEditingController(text: 'US');
  String _paymentType = 'credit-card';

  @override
  void dispose() {
    _streetCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _zipCtrl.dispose();
    _countryCtrl.dispose();
    super.dispose();
  }

  void _submit(CartState cart) {
    if (!_formKey.currentState!.validate()) return;

    final user = context.read<AuthBloc>().state.user;
    if (user == null) return;

    final items = cart.items.map((i) => {
          'productId': i.product.id,
          'quantity': i.quantity,
        }).toList();

    context.read<OrderBloc>().add(OrderCreateRequested({
          'userId': user.id,
          'items': items,
          'shippingAddress': {
            'street': _streetCtrl.text.trim(),
            'city': _cityCtrl.text.trim(),
            'state': _stateCtrl.text.trim(),
            'zipCode': _zipCtrl.text.trim(),
            'country': _countryCtrl.text.trim(),
          },
          'paymentMethod': {'type': _paymentType},
          'contactEmail': user.email,
          'subtotal': cart.subtotal,
          'tax': cart.tax,
          'shipping': cart.shipping,
          'total': cart.total,
        }));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<OrderBloc, OrderState>(
      listenWhen: (p, c) => p.status != c.status,
      listener: (context, state) {
        if (state.status == OrderStatus.placed) {
          context.read<CartBloc>().add(CartCleared());
          context.go('/orders');
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Order placed successfully!'),
              backgroundColor: AppColors.success,
            ),
          );
        }
        if (state.status == OrderStatus.failure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content:
                  Text(state.errorMessage ?? 'Failed to place order'),
              backgroundColor: AppColors.danger,
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Checkout'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSizes.md),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Shipping address
                const Text(
                  'Shipping Address',
                  style: TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: AppSizes.md),
                AppTextField(
                  label: 'Street Address',
                  controller: _streetCtrl,
                  prefixIcon: Icons.home_outlined,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: AppSizes.sm),
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        label: 'City',
                        controller: _cityCtrl,
                        validator: (v) =>
                            v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: AppSizes.sm),
                    Expanded(
                      child: AppTextField(
                        label: 'State',
                        controller: _stateCtrl,
                        validator: (v) =>
                            v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSizes.sm),
                Row(
                  children: [
                    Expanded(
                      child: AppTextField(
                        label: 'ZIP Code',
                        controller: _zipCtrl,
                        keyboardType: TextInputType.number,
                        validator: (v) =>
                            v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: AppSizes.sm),
                    Expanded(
                      child: AppTextField(
                        label: 'Country',
                        controller: _countryCtrl,
                        validator: (v) =>
                            v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSizes.xl),
                // Payment method
                const Text(
                  'Payment Method',
                  style: TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: AppSizes.sm),
                ...[
                  ('credit-card', 'Credit Card', Icons.credit_card),
                  ('debit-card', 'Debit Card', Icons.payment),
                  ('paypal', 'PayPal', Icons.account_balance_wallet_outlined),
                ].map(
                  (p) => RadioListTile<String>(
                    value: p.$1,
                    groupValue: _paymentType,
                    title: Row(
                      children: [
                        Icon(p.$3, size: 20, color: AppColors.primary),
                        const SizedBox(width: AppSizes.sm),
                        Text(p.$2),
                      ],
                    ),
                    onChanged: (v) => setState(() => _paymentType = v!),
                    contentPadding: EdgeInsets.zero,
                    activeColor: AppColors.primary,
                  ),
                ),
                const SizedBox(height: AppSizes.xl),
                // Order summary
                const Text(
                  'Order Summary',
                  style: TextStyle(
                      fontSize: 17, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: AppSizes.sm),
                BlocBuilder<CartBloc, CartState>(
                  builder: (context, cart) {
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSizes.md),
                        child: Column(
                          children: [
                            ...cart.items.map(
                              (item) => Padding(
                                padding: const EdgeInsets.only(
                                    bottom: AppSizes.xs),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '${item.product.name} × ${item.quantity}',
                                        style: const TextStyle(
                                            fontSize: 13,
                                            color: AppColors.textSecondary),
                                      ),
                                    ),
                                    Text(
                                      '\$${item.subtotal.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const Divider(),
                            _Row('Subtotal',
                                '\$${cart.subtotal.toStringAsFixed(2)}'),
                            _Row(
                                'Shipping',
                                cart.freeShipping
                                    ? 'FREE'
                                    : '\$${cart.shipping.toStringAsFixed(2)}'),
                            _Row('Tax', '\$${cart.tax.toStringAsFixed(2)}'),
                            const Divider(),
                            _Row(
                              'Total',
                              '\$${cart.total.toStringAsFixed(2)}',
                              bold: true,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: AppSizes.xl),
                BlocBuilder<OrderBloc, OrderState>(
                  buildWhen: (p, c) => p.status != c.status,
                  builder: (context, orderState) {
                    return BlocBuilder<CartBloc, CartState>(
                      builder: (context, cart) {
                        return AppButton(
                          label: 'Place Order',
                          icon: Icons.lock_outline,
                          loading: orderState.status == OrderStatus.placing,
                          onPressed: () => _submit(cart),
                        );
                      },
                    );
                  },
                ),
                const SizedBox(height: AppSizes.xl),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _Row(this.label, this.value, {this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  color: bold
                      ? AppColors.textPrimary
                      : AppColors.textSecondary,
                  fontWeight:
                      bold ? FontWeight.w700 : FontWeight.w400)),
          Text(value,
              style: TextStyle(
                  fontWeight:
                      bold ? FontWeight.w800 : FontWeight.w600,
                  color: bold ? AppColors.primary : null)),
        ],
      ),
    );
  }
}
