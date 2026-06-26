import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/order_bloc.dart';
import '../bloc/order_event.dart';
import '../bloc/order_state.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../../shared/widgets/seller_avatar.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_state.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
import '../../../cart/domain/entities/cart_item_entity.dart';
import '../../../cart/presentation/bloc/cart_event.dart';
import '../../../cart/presentation/bloc/cart_state.dart';

class CheckoutScreen extends StatefulWidget {
  /// Product IDs of the items selected in the cart for this checkout.
  final Set<String> selectedIds;

  const CheckoutScreen({super.key, this.selectedIds = const {}});

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
  final _paymentSectionKey = GlobalKey<_PaymentSectionState>();

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
    for (final c in _voucherCtrls.values) {
      c.dispose();
    }
    for (final c in _messageCtrls.values) {
      c.dispose();
    }
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

  void _submit(CartState cart, Set<String> selectedIds) {
    if (!_formKey.currentState!.validate()) return;
    // Save payment method if user checked the box
    _paymentSectionKey.currentState?._maybeSaveCard();
    final user = context.read<AuthBloc>().state.user;
    if (user == null) return;
    // Only send the selected (checked) items to the order
    final selectedItems = selectedIds.isEmpty
        ? cart.items
        : cart.items.where((i) => selectedIds.contains(i.product.id)).toList();
    final items = selectedItems
        .map((i) => {'productId': i.product.id, 'quantity': i.quantity})
        .toList();
    final totalDiscount =
        _voucherDiscounts.values.fold<double>(0, (s, d) => s + d);
    final totalShipping = cart.shippingFor(sellerDiscounts: _voucherDiscounts);
    final afterDiscount =
        (cart.subtotal - totalDiscount).clamp(0, double.infinity);
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
          context.read<CartBloc>().add(CartItemsCheckedOut(widget.selectedIds));
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
            // Only show the selected items in checkout
            final selectedItems = widget.selectedIds.isEmpty
                ? cart.items
                : cart.items
                    .where((i) => widget.selectedIds.contains(i.product.id))
                    .toList();

            // Group selected items by seller
            final groups = <String, List<CartItemEntity>>{};
            for (final item in selectedItems) {
              final key = item.product.sellerId ?? '__unknown__';
              groups.putIfAbsent(key, () => []);
              groups[key]!.add(item);
            }

            final selectedSubtotal =
                selectedItems.fold<double>(0, (s, i) => s + i.subtotal);
            final totalDiscount =
                _voucherDiscounts.values.fold<double>(0, (s, d) => s + d);
            final totalShipping =
                cart.shippingFor(sellerDiscounts: _voucherDiscounts);
            final afterDiscount =
                (selectedSubtotal - totalDiscount).clamp(0, double.infinity);
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
                          BlocBuilder<AuthBloc, AuthState>(
                            buildWhen: (p, c) =>
                                p.user?.address != c.user?.address,
                            builder: (_, authState) => _AddressSection(
                              savedAddress: authState.user?.address,
                              streetCtrl: _streetCtrl,
                              cityCtrl: _cityCtrl,
                              stateCtrl: _stateCtrl,
                              zipCtrl: _zipCtrl,
                              countryCtrl: _countryCtrl,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // ── Seller cards ──────────────────────────────────
                          ...groups.entries.map((entry) {
                            final sellerKey = entry.key;
                            final items = entry.value;
                            final sellerName = items.first.product.sellerName;
                            final groupSubtotal =
                                items.fold<double>(0, (s, i) => s + i.subtotal);
                            final discount = _voucherDiscounts[sellerKey] ?? 0;
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
                          BlocBuilder<AuthBloc, AuthState>(
                            buildWhen: (p, c) =>
                                p.user?.savedCards != c.user?.savedCards,
                            builder: (_, authState) => _PaymentSection(
                              key: _paymentSectionKey,
                              selected: _paymentType,
                              onChanged: (v) =>
                                  setState(() => _paymentType = v),
                              savedCards:
                                  authState.user?.savedCards ?? const [],
                            ),
                          ),

                          const SizedBox(height: 8),

                          // ── Order total breakdown ─────────────────────────
                          _TotalBreakdown(
                            subtotal: selectedSubtotal,
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
                    loading: context.watch<OrderBloc>().state.status ==
                        OrderStatus.placing,
                    onPlace: () => _submit(cart, widget.selectedIds),
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

enum _AddressMode { saved, newAddress }

class _AddressSection extends StatefulWidget {
  final AddressEntity? savedAddress;
  final TextEditingController streetCtrl,
      cityCtrl,
      stateCtrl,
      zipCtrl,
      countryCtrl;

  const _AddressSection({
    required this.savedAddress,
    required this.streetCtrl,
    required this.cityCtrl,
    required this.stateCtrl,
    required this.zipCtrl,
    required this.countryCtrl,
  });

  @override
  State<_AddressSection> createState() => _AddressSectionState();
}

class _AddressSectionState extends State<_AddressSection> {
  late _AddressMode _mode;

  @override
  void initState() {
    super.initState();
    // Default: use saved address when available
    _mode = widget.savedAddress != null
        ? _AddressMode.saved
        : _AddressMode.newAddress;
    if (widget.savedAddress != null) _fillSaved(widget.savedAddress!);
  }

  void _fillSaved(AddressEntity addr) {
    widget.streetCtrl.text = addr.street;
    widget.cityCtrl.text = addr.city;
    widget.stateCtrl.text = addr.state;
    widget.zipCtrl.text = addr.zipCode;
    widget.countryCtrl.text = addr.country.isNotEmpty ? addr.country : 'US';
  }

  void _clearFields() {
    widget.streetCtrl.clear();
    widget.cityCtrl.clear();
    widget.stateCtrl.clear();
    widget.zipCtrl.clear();
    widget.countryCtrl.text = 'US';
  }

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

          // ── Saved address option ──────────────────────────────────────
          if (widget.savedAddress != null) ...[
            _AddressOption(
              title: 'Saved Address',
              subtitle: _formatAddress(widget.savedAddress!),
              icon: Icons.home_rounded,
              selected: _mode == _AddressMode.saved,
              onTap: () {
                setState(() => _mode = _AddressMode.saved);
                _fillSaved(widget.savedAddress!);
              },
            ),
            const SizedBox(height: AppSizes.xs),
          ],

          // ── New address option ────────────────────────────────────────
          _AddressOption(
            title: 'New Address',
            subtitle: 'Enter a different delivery address',
            icon: Icons.add_location_alt_outlined,
            selected: _mode == _AddressMode.newAddress,
            onTap: () {
              setState(() => _mode = _AddressMode.newAddress);
              _clearFields();
            },
          ),

          // ── Form fields (always present for validation; hidden when saved) ──
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 200),
            crossFadeState: _mode == _AddressMode.newAddress
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.only(top: AppSizes.sm),
              child: Column(
                children: [
                  AppTextField(
                    label: 'Street Address',
                    controller: widget.streetCtrl,
                    prefixIcon: Icons.home_outlined,
                    keyboardType: TextInputType.streetAddress,
                    textInputAction: TextInputAction.next,
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: AppSizes.xs),
                  Row(
                    children: [
                      Expanded(
                        child: AppTextField(
                          label: 'City',
                          controller: widget.cityCtrl,
                          keyboardType: TextInputType.text,
                          textInputAction: TextInputAction.next,
                          validator: (v) =>
                              v == null || v.trim().isEmpty ? 'Required' : null,
                        ),
                      ),
                      const SizedBox(width: AppSizes.sm),
                      Expanded(
                        child: AppTextField(
                          label: 'State',
                          controller: widget.stateCtrl,
                          keyboardType: TextInputType.text,
                          textInputAction: TextInputAction.next,
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
                          controller: widget.zipCtrl,
                          keyboardType: TextInputType.number,
                          textInputAction: TextInputAction.next,
                          validator: (v) =>
                              v == null || v.trim().isEmpty ? 'Required' : null,
                        ),
                      ),
                      const SizedBox(width: AppSizes.sm),
                      Expanded(
                        child: AppTextField(
                          label: 'Country',
                          controller: widget.countryCtrl,
                          keyboardType: TextInputType.text,
                          textInputAction: TextInputAction.done,
                          validator: (v) =>
                              v == null || v.trim().isEmpty ? 'Required' : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatAddress(AddressEntity a) {
    final parts = [a.street, a.city, a.state, a.zipCode, a.country]
        .where((s) => s.isNotEmpty)
        .toList();
    return parts.join(', ');
  }
}

class _AddressOption extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _AddressOption({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(
            horizontal: AppSizes.sm, vertical: AppSizes.xs + 2),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withValues(alpha: 0.06)
              : context.surfaceVariantColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(
            color: selected ? AppColors.primary : context.borderColor,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: RadioGroup<bool>(
          groupValue: selected,
          onChanged: (_) => onTap(),
          child: Row(
            children: [
              const Radio<bool>(
                value: true,
                fillColor: WidgetStatePropertyAll(AppColors.primary),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                visualDensity: VisualDensity.compact,
              ),
              const SizedBox(width: 4),
              Icon(icon,
                  size: 18,
                  color: selected ? AppColors.primary : context.onSurfaceMuted),
              const SizedBox(width: AppSizes.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: selected
                            ? AppColors.primary
                            : context.onSurfaceColor,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11,
                        color: context.onSurfaceMuted,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
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
                    style:
                        TextStyle(fontSize: 13, color: context.onSurfaceMuted),
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
                        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                    ),
                    style:
                        TextStyle(fontSize: 13, color: context.onSurfaceColor),
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
                    style:
                        TextStyle(fontSize: 13, color: context.onSurfaceColor)),
                const Spacer(),
                Text(
                  widget.controller.text.isEmpty
                      ? 'Please leave a message'
                      : widget.controller.text,
                  style: TextStyle(fontSize: 13, color: context.onSurfaceMuted),
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
              keyboardType: TextInputType.multiline,
              textInputAction: TextInputAction.newline,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Leave a message for the seller...',
                hintStyle:
                    TextStyle(fontSize: 13, color: context.onSurfaceMuted),
                isDense: true,
                filled: true,
                fillColor: context.surfaceVariantColor,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSizes.radiusMd),
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

enum _CardMode { saved, newCard }

class _PaymentSection extends StatefulWidget {
  final String selected;
  final ValueChanged<String> onChanged;
  final List<SavedCardEntity> savedCards;

  const _PaymentSection({
    super.key,
    required this.selected,
    required this.onChanged,
    this.savedCards = const [],
  });

  @override
  State<_PaymentSection> createState() => _PaymentSectionState();
}

class _PaymentSectionState extends State<_PaymentSection> {
  late _CardMode _mode;
  late String _selectedCardId;
  bool _saveCard = false;

  // new-card form controllers
  final _cardNumberCtrl = TextEditingController();
  final _cardHolderCtrl = TextEditingController();
  String _expiryMonth = '01';
  String _expiryYear = DateTime.now().year.toString();

  @override
  void initState() {
    super.initState();
    _mode = widget.savedCards.isNotEmpty ? _CardMode.saved : _CardMode.newCard;
    final def = widget.savedCards.where((c) => c.isDefault).firstOrNull ??
        widget.savedCards.firstOrNull;
    _selectedCardId = def?.id ?? '';
  }

  @override
  void dispose() {
    _cardNumberCtrl.dispose();
    _cardHolderCtrl.dispose();
    super.dispose();
  }

  void _maybeSaveCard() {
    if (_saveCard && _mode == _CardMode.newCard) {
      _savePaymentMethod();
    }
  }

  Future<void> _savePaymentMethod() async {
    final num = _cardNumberCtrl.text.replaceAll(' ', '');
    if (num.length < 4) return;
    try {
      await _http('POST', '/auth/payment-methods', {
        'type': widget.selected,
        'last4': num.substring(num.length - 4),
        'cardHolder': _cardHolderCtrl.text.trim(),
        'expiryMonth': _expiryMonth,
        'expiryYear': _expiryYear,
        'setAsDefault': widget.savedCards.isEmpty,
      });
    } catch (_) {/* best-effort */}
  }

  Future<void> _deleteCard(String id) async {
    try {
      await _http('DELETE', '/auth/payment-methods/$id', null);
      setState(() {
        if (_selectedCardId == id) {
          final remaining = widget.savedCards.where((c) => c.id != id).toList();
          _selectedCardId = remaining.firstOrNull?.id ?? '';
          if (remaining.isEmpty) _mode = _CardMode.newCard;
        }
      });
    } catch (_) {}
  }

  Future<void> _http(
      String method, String path, Map<String, dynamic>? body) async {
    final client = await ApiClient.get();
    if (method == 'DELETE') {
      await client.dio.delete(path);
    } else {
      await client.dio.post(path, data: body);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasSaved = widget.savedCards.isNotEmpty;

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
          const SizedBox(height: AppSizes.sm),

          // ── Mode toggle (only when saved cards exist) ──
          if (hasSaved) ...[
            Row(children: [
              _ModeChip(
                label: 'Saved Card',
                selected: _mode == _CardMode.saved,
                onTap: () => setState(() => _mode = _CardMode.saved),
              ),
              const SizedBox(width: 8),
              _ModeChip(
                label: '+ New Card',
                selected: _mode == _CardMode.newCard,
                onTap: () => setState(() => _mode = _CardMode.newCard),
              ),
            ]),
            const SizedBox(height: AppSizes.sm),
          ],

          // ── Saved card list ──
          if (_mode == _CardMode.saved && hasSaved)
            RadioGroup<String>(
              groupValue: _selectedCardId,
              onChanged: (v) => setState(() => _selectedCardId = v!),
              child: Column(
                children: widget.savedCards
                    .map((card) => GestureDetector(
                          onTap: () =>
                              setState(() => _selectedCardId = card.id),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _selectedCardId == card.id
                                    ? AppColors.primary
                                    : context.onSurfaceColor.withAlpha(40),
                                width: _selectedCardId == card.id ? 2 : 1,
                              ),
                              color: _selectedCardId == card.id
                                  ? AppColors.primary.withAlpha(20)
                                  : context.surfaceColor,
                            ),
                            child: Row(children: [
                              Radio<String>(
                                value: card.id,
                                fillColor: const WidgetStatePropertyAll(
                                    AppColors.primary),
                                materialTapTargetSize:
                                    MaterialTapTargetSize.shrinkWrap,
                              ),
                              const SizedBox(width: 4),
                              Icon(Icons.credit_card,
                                  size: 18,
                                  color: context.onSurfaceColor.withAlpha(180)),
                              const SizedBox(width: 8),
                              Expanded(
                                  child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${card.type.replaceAll('-', ' ')} •••• ${card.last4}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: context.onSurfaceColor,
                                    ),
                                  ),
                                  Text(
                                    '${card.cardHolder} · ${card.expiryMonth}/${card.expiryYear}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color:
                                          context.onSurfaceColor.withAlpha(140),
                                    ),
                                  ),
                                ],
                              )),
                              Semantics(
                                label: 'Delete saved card',
                                button: true,
                                child: IconButton(
                                  icon: Icon(Icons.delete_outline,
                                      size: 20,
                                      color: Colors.red.withAlpha(200)),
                                  onPressed: () => _deleteCard(card.id),
                                  padding: const EdgeInsets.all(8),
                                  constraints: const BoxConstraints(
                                      minWidth: 44, minHeight: 44),
                                ),
                              ),
                            ]),
                          ),
                        ))
                    .toList(),
              ),
            ),

          // ── New card form ──
          if (_mode == _CardMode.newCard) ...[
            _NewCardForm(
              paymentType: widget.selected,
              onTypeChanged: widget.onChanged,
              cardNumberCtrl: _cardNumberCtrl,
              cardHolderCtrl: _cardHolderCtrl,
              expiryMonth: _expiryMonth,
              expiryYear: _expiryYear,
              onMonthChanged: (v) => setState(() => _expiryMonth = v),
              onYearChanged: (v) => setState(() => _expiryYear = v),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => setState(() => _saveCard = !_saveCard),
              child: Row(children: [
                Checkbox(
                  value: _saveCard,
                  onChanged: (v) => setState(() => _saveCard = v!),
                  fillColor: WidgetStateProperty.resolveWith(
                    (states) => states.contains(WidgetState.selected)
                        ? AppColors.primary
                        : null,
                  ),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                const SizedBox(width: 4),
                Text(
                  'Save this card for future purchases',
                  style: TextStyle(fontSize: 13, color: context.onSurfaceColor),
                ),
              ]),
            ),
          ],
        ],
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ModeChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: selected ? AppColors.primary : Colors.transparent,
          border: Border.all(
            color: selected
                ? AppColors.primary
                : context.onSurfaceColor.withAlpha(60),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : context.onSurfaceColor,
          ),
        ),
      ),
    );
  }
}

class _NewCardForm extends StatelessWidget {
  final String paymentType;
  final ValueChanged<String> onTypeChanged;
  final TextEditingController cardNumberCtrl;
  final TextEditingController cardHolderCtrl;
  final String expiryMonth;
  final String expiryYear;
  final ValueChanged<String> onMonthChanged;
  final ValueChanged<String> onYearChanged;

  const _NewCardForm({
    required this.paymentType,
    required this.onTypeChanged,
    required this.cardNumberCtrl,
    required this.cardHolderCtrl,
    required this.expiryMonth,
    required this.expiryYear,
    required this.onMonthChanged,
    required this.onYearChanged,
  });

  @override
  Widget build(BuildContext context) {
    final options = [
      ('credit-card', 'Credit Card', Icons.credit_card),
      ('debit-card', 'Debit Card', Icons.payment),
      ('paypal', 'PayPal', Icons.account_balance_wallet_outlined),
    ];
    final months = List.generate(12, (i) => (i + 1).toString().padLeft(2, '0'));
    final years =
        List.generate(10, (i) => (DateTime.now().year + i).toString());

    return Column(children: [
      RadioGroup<String>(
        groupValue: paymentType,
        onChanged: (v) => onTypeChanged(v!),
        child: Column(
          children: options
              .map((p) => RadioListTile<String>(
                    value: p.$1,
                    title: Row(children: [
                      Icon(p.$3, size: 18, color: AppColors.primary),
                      const SizedBox(width: 8),
                      Text(p.$2,
                          style: TextStyle(
                              fontSize: 13, color: context.onSurfaceColor)),
                    ]),
                    fillColor: const WidgetStatePropertyAll(AppColors.primary),
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                  ))
              .toList(),
        ),
      ),
      AppTextField(
        label: 'Card Number',
        controller: cardNumberCtrl,
        keyboardType: TextInputType.number,
        prefixIcon: Icons.credit_card_outlined,
      ),
      const SizedBox(height: 8),
      AppTextField(
        label: 'Cardholder Name',
        controller: cardHolderCtrl,
        prefixIcon: Icons.person_outline,
        keyboardType: TextInputType.name,
        textInputAction: TextInputAction.next,
      ),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(
            child: _DropdownField(
          label: 'Month',
          value: expiryMonth,
          items: months,
          onChanged: onMonthChanged,
        )),
        const SizedBox(width: 8),
        Expanded(
            child: _DropdownField(
          label: 'Year',
          value: expiryYear,
          items: years,
          onChanged: onYearChanged,
        )),
      ]),
    ]);
  }
}

class _DropdownField extends StatelessWidget {
  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;
  const _DropdownField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label,
          style: TextStyle(
              fontSize: 12, color: context.onSurfaceColor.withAlpha(160))),
      const SizedBox(height: 4),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: context.onSurfaceColor.withAlpha(60)),
        ),
        child: DropdownButton<String>(
          value: value,
          isExpanded: true,
          underline: const SizedBox.shrink(),
          dropdownColor: context.surfaceColor,
          style: TextStyle(fontSize: 13, color: context.onSurfaceColor),
          items: items
              .map((v) => DropdownMenuItem(value: v, child: Text(v)))
              .toList(),
          onChanged: (v) => onChanged(v!),
        ),
      ),
    ]);
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
              style:
                  TextStyle(fontSize: 13, color: context.onSurfaceSecondary)),
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
        border: Border(top: BorderSide(color: context.borderColor, width: 0.5)),
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
                          fontSize: 12, color: context.onSurfaceSecondary)),
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
