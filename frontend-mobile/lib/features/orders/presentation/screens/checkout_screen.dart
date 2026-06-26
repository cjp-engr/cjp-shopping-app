import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/order_bloc.dart';
import '../bloc/order_event.dart';
import '../bloc/order_state.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../../shared/widgets/seller_avatar.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
import '../../../cart/domain/entities/cart_item_entity.dart';
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

  // Per-seller voucher codes (key = sellerId or '__unknown__')
  final Map<String, TextEditingController> _voucherCtrls = {};
  final Map<String, double> _voucherDiscounts = {};
  final Map<String, TextEditingController> _messageCtrls = {};

  @override
  void dispose() {
    _streetCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _zipCtrl.dispose();
    _countryCtrl.dispose();
    for (final c in _voucherCtrls.values) { c.dispose(); }
    for (final c in _messageCtrls.values) { c.dispose(); }
    super.dispose();
  }

  TextEditingController _voucherCtrl(String key) =>
      _voucherCtrls.putIfAbsent(key, () => TextEditingController());

  TextEditingController _messageCtrl(String key) =>
      _messageCtrls.putIfAbsent(key, () => TextEditingController());

  void _applyVoucher(String key, List<CartItemEntity> items) {
    final code = _voucherCtrl(key).text.trim().toUpperCase();
    final groupTotal = items.fold<double>(0, (s, i) => s + i.subtotal);
    double discount = 0;
    if (code == 'SAVE10') {
      discount = groupTotal * 0.1;
    } else if (code == 'SAVE20') {
      discount = groupTotal * 0.2;
    }
    setState(() => _voucherDiscounts[key] = discount);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(discount > 0
          ? 'Voucher applied: -\$${discount.toStringAsFixed(2)}'
          : 'Invalid voucher code'),
      duration: const Duration(seconds: 2),
    ));
  }

  void _submit(CartState cart) {
    if (!_formKey.currentState!.validate()) return;
    final user = context.read<AuthBloc>().state.user;
    if (user == null) return;
    final items = cart.items.map((i) => {
          'productId': i.product.id,
          'quantity': i.quantity,
        }).toList();
    final totalDiscount = _voucherDiscounts.values.fold<double>(0, (s, d) => s + d);
    final totalShipping = cart.shippingFor(sellerDiscounts: _voucherDiscounts);
    final afterDiscount = (cart.subtotal - totalDiscount).clamp(0, double.infinity);
    final totalTax = afterDiscount * 0.08;
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
          'sellerMessages': {
            for (final e in _messageCtrls.entries)
              if (e.value.text.trim().isNotEmpty) e.key: e.value.text.trim(),
          },
          'contactEmail': user.email,
          'subtotal': afterDiscount,
          'tax': totalTax,
          'shipping': totalShipping,
          'total': afterDiscount + totalShipping + totalTax,
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
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(state.errorMessage ?? 'Failed to place order'),
            backgroundColor: AppColors.danger,
          ));
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
        body: BlocBuilder<CartBloc, CartState>(
          builder: (context, cart) {
            // Group items by seller
            final groups = <String, List<CartItemEntity>>{};
            for (final item in cart.items) {
              final key = item.product.sellerId ?? '__unknown__';
              groups.putIfAbsent(key, () => []);
              groups[key]!.add(item);
            }

            final totalDiscount =
                _voucherDiscounts.values.fold<double>(0, (s, d) => s + d);
            final totalShipping =
                cart.shippingFor(sellerDiscounts: _voucherDiscounts);
            final afterDiscount =
                (cart.subtotal - totalDiscount).clamp(0, double.infinity);
            final totalTax = afterDiscount * 0.08;
            final grandTotal = afterDiscount + totalShipping + totalTax;

            return Form(
              key: _formKey,
              child: Column(
                children: [
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.only(bottom: AppSizes.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // ── Shipping address ──────────────────────────────
                          _ShippingAddressSection(
                            streetCtrl: _streetCtrl,
                            cityCtrl: _cityCtrl,
                            stateCtrl: _stateCtrl,
                            zipCtrl: _zipCtrl,
                            countryCtrl: _countryCtrl,
                          ),
                          const SizedBox(height: 8),

                          // ── Seller cards ──────────────────────────────────
                          ...groups.entries.map((entry) {
                            final sellerKey = entry.key;
                            final items = entry.value;
                            final sellerName =
                                items.first.product.sellerName;
                            final groupSubtotal = items.fold<double>(
                                0, (s, i) => s + i.subtotal);
                            final discount =
                                _voucherDiscounts[sellerKey] ?? 0;
                            final storeTotal = groupSubtotal - discount;

                            return _SellerCard(
                              sellerName: sellerName,
                              items: items,
                              voucherCtrl: _voucherCtrl(sellerKey),
                              messageCtrl: _messageCtrl(sellerKey),
                              discount: discount,
                              storeTotal: storeTotal,
                              onApplyVoucher: () =>
                                  _applyVoucher(sellerKey, items),
                            );
                          }),

                          const SizedBox(height: 8),

                          // ── Payment method ────────────────────────────────
                          _PaymentSection(
                            selected: _paymentType,
                            onChanged: (v) =>
                                setState(() => _paymentType = v),
                          ),

                          const SizedBox(height: 8),

                          // ── Order total breakdown ─────────────────────────
                          _TotalBreakdown(
                            subtotal: cart.subtotal,
                            totalDiscount: totalDiscount,
                            totalShipping: totalShipping,
                            totalTax: totalTax,
                            grandTotal: grandTotal,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // ── Bottom bar ────────────────────────────────────────────
                  _BottomBar(
                    total: grandTotal,
                    saved: totalDiscount,
                    loading: context
                            .watch<OrderBloc>()
                            .state
                            .status ==
                        OrderStatus.placing,
                    onPlace: () => _submit(cart),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

// ── Shipping address section ──────────────────────────────────────────────────

class _ShippingAddressSection extends StatelessWidget {
  final TextEditingController streetCtrl, cityCtrl, stateCtrl, zipCtrl,
      countryCtrl;
  const _ShippingAddressSection({
    required this.streetCtrl,
    required this.cityCtrl,
    required this.stateCtrl,
    required this.zipCtrl,
    required this.countryCtrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: context.surfaceColor,
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.location_on_outlined,
                  size: 16, color: AppColors.primary),
              const SizedBox(width: 6),
              Text(
                'Delivery Address',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSizes.sm),
          AppTextField(
            label: 'Street Address',
            controller: streetCtrl,
            prefixIcon: Icons.home_outlined,
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: AppSizes.xs),
          Row(
            children: [
              Expanded(
                child: AppTextField(
                  label: 'City',
                  controller: cityCtrl,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
              ),
              const SizedBox(width: AppSizes.sm),
              Expanded(
                child: AppTextField(
                  label: 'State',
                  controller: stateCtrl,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSizes.xs),
          Row(
            children: [
              Expanded(
                child: AppTextField(
                  label: 'ZIP Code',
                  controller: zipCtrl,
                  keyboardType: TextInputType.number,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
              ),
              const SizedBox(width: AppSizes.sm),
              Expanded(
                child: AppTextField(
                  label: 'Country',
                  controller: countryCtrl,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Per-seller card ───────────────────────────────────────────────────────────

class _SellerCard extends StatelessWidget {
  final String? sellerName;
  final List<CartItemEntity> items;
  final TextEditingController voucherCtrl;
  final TextEditingController messageCtrl;
  final double discount;
  final double storeTotal;
  final VoidCallback onApplyVoucher;

  const _SellerCard({
    required this.sellerName,
    required this.items,
    required this.voucherCtrl,
    required this.messageCtrl,
    required this.discount,
    required this.storeTotal,
    required this.onApplyVoucher,
  });

  @override
  Widget build(BuildContext context) {
    final name = sellerName?.isNotEmpty == true ? sellerName! : 'Store';
    final itemCount = items.fold<int>(0, (s, i) => s + i.quantity);

    return Container(
      color: context.surfaceColor,
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Seller name header
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSizes.md, AppSizes.sm, AppSizes.md, AppSizes.xs),
            child: Row(
              children: [
                SellerAvatar(name: name, size: 20),
                const SizedBox(width: 8),
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: context.onSurfaceColor,
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Items
          ...items.map((item) => _CheckoutItemRow(item: item)),

          const Divider(height: 1),

          // Shop Voucher row
          _VoucherRow(
            controller: voucherCtrl,
            discount: discount,
            onApply: onApplyVoucher,
          ),

          const Divider(height: 1),

          // Message for seller
          _MessageRow(controller: messageCtrl),

          const Divider(height: 1),

          // Store total
          Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.md, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total $itemCount Item${itemCount != 1 ? 's' : ''}',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: context.onSurfaceSecondary,
                  ),
                ),
                Text(
                  '\$${storeTotal.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: context.onSurfaceColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Item row inside seller card ───────────────────────────────────────────────

class _CheckoutItemRow extends StatelessWidget {
  final CartItemEntity item;
  const _CheckoutItemRow({required this.item});

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
            child: Image.network(
              item.product.image,
              width: 72,
              height: 72,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                  width: 72, height: 72, color: AppColors.shimmerBase),
            ),
          ),
          const SizedBox(width: AppSizes.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.product.name,
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
                      '\$${item.product.price.toStringAsFixed(2)}',
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

// ── Voucher row ───────────────────────────────────────────────────────────────

class _VoucherRow extends StatefulWidget {
  final TextEditingController controller;
  final double discount;
  final VoidCallback onApply;
  const _VoucherRow({
    required this.controller,
    required this.discount,
    required this.onApply,
  });

  @override
  State<_VoucherRow> createState() => _VoucherRowState();
}

class _VoucherRowState extends State<_VoucherRow> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.md, vertical: 12),
            child: Row(
              children: [
                Icon(Icons.local_offer_outlined,
                    size: 16, color: context.onSurfaceMuted),
                const SizedBox(width: 8),
                Text(
                  'Shop Voucher',
                  style: TextStyle(
                    fontSize: 13,
                    color: context.onSurfaceColor,
                  ),
                ),
                const Spacer(),
                if (widget.discount > 0)
                  Text(
                    '-\$${widget.discount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  )
                else
                  Text(
                    'Select or enter code',
                    style: TextStyle(
                        fontSize: 13, color: context.onSurfaceMuted),
                  ),
                const SizedBox(width: 4),
                Icon(
                  _expanded
                      ? Icons.keyboard_arrow_up
                      : Icons.keyboard_arrow_right,
                  size: 16,
                  color: context.onSurfaceMuted,
                ),
              ],
            ),
          ),
        ),
        if (_expanded)
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSizes.md, 0, AppSizes.md, AppSizes.sm),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: widget.controller,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      hintText: 'Enter voucher code',
                      hintStyle: TextStyle(
                          fontSize: 13, color: context.onSurfaceMuted),
                      isDense: true,
                      filled: true,
                      fillColor: context.surfaceVariantColor,
                      border: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(AppSizes.radiusMd),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                    ),
                    style: TextStyle(
                        fontSize: 13, color: context.onSurfaceColor),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: widget.onApply,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                  ),
                  child: const Text('Apply',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// ── Message for seller row ────────────────────────────────────────────────────

class _MessageRow extends StatefulWidget {
  final TextEditingController controller;
  const _MessageRow({required this.controller});

  @override
  State<_MessageRow> createState() => _MessageRowState();
}

class _MessageRowState extends State<_MessageRow> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        InkWell(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.md, vertical: 12),
            child: Row(
              children: [
                Icon(Icons.chat_bubble_outline,
                    size: 16, color: context.onSurfaceMuted),
                const SizedBox(width: 8),
                Text('Message for Seller',
                    style: TextStyle(
                        fontSize: 13, color: context.onSurfaceColor)),
                const Spacer(),
                Text(
                  widget.controller.text.isEmpty
                      ? 'Please leave a message'
                      : widget.controller.text,
                  style: TextStyle(
                      fontSize: 13, color: context.onSurfaceMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(width: 4),
                Icon(
                  _expanded
                      ? Icons.keyboard_arrow_up
                      : Icons.keyboard_arrow_right,
                  size: 16,
                  color: context.onSurfaceMuted,
                ),
              ],
            ),
          ),
        ),
        if (_expanded)
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSizes.md, 0, AppSizes.md, AppSizes.sm),
            child: TextField(
              controller: widget.controller,
              maxLines: 3,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Leave a message for the seller...',
                hintStyle:
                    TextStyle(fontSize: 13, color: context.onSurfaceMuted),
                isDense: true,
                filled: true,
                fillColor: context.surfaceVariantColor,
                border: OutlineInputBorder(
                  borderRadius:
                      BorderRadius.circular(AppSizes.radiusMd),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.all(12),
              ),
              style: TextStyle(fontSize: 13, color: context.onSurfaceColor),
            ),
          ),
      ],
    );
  }
}

// ── Payment method ────────────────────────────────────────────────────────────

class _PaymentSection extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onChanged;
  const _PaymentSection(
      {required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final options = [
      ('credit-card', 'Credit Card', Icons.credit_card),
      ('debit-card', 'Debit Card', Icons.payment),
      ('paypal', 'PayPal', Icons.account_balance_wallet_outlined),
    ];

    return Container(
      color: context.surfaceColor,
      padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.md, vertical: AppSizes.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Payment Method',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: context.onSurfaceColor,
            ),
          ),
          ...options.map(
            (p) => RadioListTile<String>(
              value: p.$1,
              groupValue: selected,
              title: Row(
                children: [
                  Icon(p.$3, size: 18, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(p.$2,
                      style: TextStyle(
                          fontSize: 13, color: context.onSurfaceColor)),
                ],
              ),
              onChanged: (v) => onChanged(v!),
              contentPadding: EdgeInsets.zero,
              activeColor: AppColors.primary,
              dense: true,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Order total breakdown ─────────────────────────────────────────────────────

class _TotalBreakdown extends StatelessWidget {
  final double subtotal;
  final double totalDiscount;
  final double totalShipping;
  final double totalTax;
  final double grandTotal;
  const _TotalBreakdown({
    required this.subtotal,
    required this.totalDiscount,
    required this.totalShipping,
    required this.totalTax,
    required this.grandTotal,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: context.surfaceColor,
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Summary',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: context.onSurfaceColor,
            ),
          ),
          const SizedBox(height: AppSizes.sm),
          _summaryRow('Merchandise Subtotal',
              '\$${subtotal.toStringAsFixed(2)}', context),
          if (totalDiscount > 0)
            _summaryRow('Voucher Savings',
                '-\$${totalDiscount.toStringAsFixed(2)}', context,
                valueColor: AppColors.success),
          _summaryRow(
            'Shipping Fee',
            totalShipping == 0
                ? 'FREE'
                : '\$${totalShipping.toStringAsFixed(2)}',
            context,
            valueColor: totalShipping == 0 ? AppColors.success : null,
          ),
          _summaryRow('Tax (8%)', '\$${totalTax.toStringAsFixed(2)}', context),
          const Divider(height: AppSizes.lg),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Payment',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: context.onSurfaceColor,
                ),
              ),
              Text(
                '\$${grandTotal.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, BuildContext context,
      {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 13, color: context.onSurfaceSecondary)),
          Text(value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: valueColor ?? context.onSurfaceColor,
              )),
        ],
      ),
    );
  }
}

// ── Bottom bar ────────────────────────────────────────────────────────────────

class _BottomBar extends StatelessWidget {
  final double total;
  final double saved;
  final bool loading;
  final VoidCallback onPlace;
  const _BottomBar({
    required this.total,
    required this.saved,
    required this.loading,
    required this.onPlace,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.surfaceColor,
        border: Border(
            top: BorderSide(color: context.borderColor, width: 0.5)),
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
              Row(
                children: [
                  Text('Total  ',
                      style: TextStyle(
                          fontSize: 12,
                          color: context.onSurfaceSecondary)),
                  Text(
                    '\$${total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              if (saved > 0)
                Text(
                  'Saved \$${saved.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.success,
                  ),
                ),
            ],
          ),
          const SizedBox(width: AppSizes.md),
          Expanded(
            child: AppButton(
              label: 'Place Order',
              icon: Icons.lock_outline,
              loading: loading,
              onPressed: onPlace,
            ),
          ),
        ],
      ),
    );
  }
}
