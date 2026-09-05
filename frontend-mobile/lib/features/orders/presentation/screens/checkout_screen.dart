import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../keys.dart';
import '../bloc/order_bloc.dart';
import '../bloc/order_event.dart';
import '../bloc/order_state.dart';
import '../../../voucher/data/voucher_repository.dart';
import '../../../voucher/presentation/select_voucher_screen.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';
import '../../../../shared/widgets/seller_avatar.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_event.dart';
import '../../../auth/presentation/bloc/auth_state.dart';
import '../../../auth/domain/entities/user_entity.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
import '../../../cart/domain/entities/cart_item_entity.dart';
import '../../../cart/presentation/bloc/cart_event.dart';
import '../../../cart/presentation/bloc/cart_state.dart';

class CheckoutScreen extends StatefulWidget {
  /// Product IDs of the items selected in the cart for this checkout.
  final Set<String> selectedIds;

  /// Pre-selected delivery options from the cart screen (seller key → option).
  final Map<String, String> initialDeliverySelections;

  /// Pre-applied vouchers from the cart screen (seller key → VoucherSelection).
  final Map<String, VoucherSelection> initialVoucherSelections;

  const CheckoutScreen({
    super.key,
    this.selectedIds = const {},
    this.initialDeliverySelections = const {},
    this.initialVoucherSelections = const {},
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _streetCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _stateCtrl = TextEditingController();
  final _zipCtrl = TextEditingController();
  String _paymentType = 'credit-card';
  final _paymentSectionKey = GlobalKey<_PaymentSectionState>();
  final _addressSectionKey = GlobalKey<_AddressSectionState>();

  // Per-seller voucher codes (key = sellerId or '__unknown__')
  final Map<String, TextEditingController> _voucherCtrls = {};
  final Map<String, double> _voucherDiscounts = {};
  final Map<String, String> _appliedVoucherCodes = {};
  final Map<String, TextEditingController> _messageCtrls = {};
  late final VoucherRepository _voucherRepo;

  // Per-seller delivery option selection (key = sellerId or '__unknown__')
  late final Map<String, String> _deliverySelections;

  @override
  void dispose() {
    _streetCtrl.dispose();
    _cityCtrl.dispose();
    _stateCtrl.dispose();
    _zipCtrl.dispose();
    for (final c in _voucherCtrls.values) {
      c.dispose();
    }
    for (final c in _messageCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _deliverySelections =
        Map<String, String>.from(widget.initialDeliverySelections);
    // Pre-populate voucher state from cart selections
    for (final entry in widget.initialVoucherSelections.entries) {
      _voucherDiscounts[entry.key] = entry.value.discountAmount;
      _appliedVoucherCodes[entry.key] = entry.value.code;
      _voucherCtrl(entry.key).text = entry.value.code;
    }
    ApiClient.get().then((client) {
      if (mounted) _voucherRepo = VoucherRepository(client);
    });
  }

  TextEditingController _voucherCtrl(String key) =>
      _voucherCtrls.putIfAbsent(key, () => TextEditingController());

  TextEditingController _messageCtrl(String key) =>
      _messageCtrls.putIfAbsent(key, () => TextEditingController());

  Future<void> _openVoucherScreen(
      String sellerKey, String sellerName, double orderAmount) async {
    final result = await Navigator.of(context).push<VoucherSelection?>(
      MaterialPageRoute(
        builder: (_) => SelectVoucherScreen(
          sellerId: sellerKey,
          sellerName: sellerName,
          orderAmount: orderAmount,
          currentCode: _appliedVoucherCodes[sellerKey],
        ),
      ),
    );
    if (!mounted) return;
    setState(() {
      if (result != null) {
        _voucherDiscounts[sellerKey] = result.discountAmount;
        _appliedVoucherCodes[sellerKey] = result.code;
        _voucherCtrl(sellerKey).text = result.code;
      } else {
        _voucherDiscounts.remove(sellerKey);
        _appliedVoucherCodes.remove(sellerKey);
        _voucherCtrl(sellerKey).clear();
      }
    });
  }

  Future<void> _applyVoucher(String key, List<CartItemEntity> items) async {
    final code = _voucherCtrl(key).text.trim().toUpperCase();
    if (code.isEmpty) return;
    final groupTotal = items.fold<double>(0, (s, i) => s + i.subtotal);
    try {
      final result = await _voucherRepo.validate(code, key, groupTotal);
      if (!mounted) return;
      setState(() {
        _voucherDiscounts[key] = result.discountAmount;
        _appliedVoucherCodes[key] = result.coupon.code;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _voucherDiscounts.remove(key));
    }
  }

  void _submit(CartState cart, Set<String> selectedIds) {
    if (!_formKey.currentState!.validate()) return;
    // Save payment method if user checked the box
    _paymentSectionKey.currentState?._maybeSaveCard();
    // Save new address to profile if user opted in
    if (_addressSectionKey.currentState?.selectedId == 'new' &&
        _addressSectionKey.currentState?.saveAddress == true) {
      context.read<AuthBloc>().add(AuthAddressAddRequested({
        'street': _streetCtrl.text.trim(),
        'city': _cityCtrl.text.trim(),
        'state': _stateCtrl.text.trim(),
        'zipCode': _zipCtrl.text.trim(),
        'country': 'PH',
      }));
    }
    final user = context.read<AuthBloc>().state.user;
    if (user == null) return;
    // Only send the selected (checked) items to the order
    final selectedItems = selectedIds.isEmpty
        ? cart.items
        : cart.items.where((i) => selectedIds.contains(i.product.id)).toList();
    final deliverySelections = Map<String, String>.from(_deliverySelections);
    for (final item in selectedItems) {
      final sellerKey = item.product.sellerId ?? '__unknown__';
      if (!deliverySelections.containsKey(sellerKey)) {
        final defaultOption = item.product.shippingOptions.firstOrNull;
        if (defaultOption != null) {
          deliverySelections[sellerKey] = defaultOption;
        }
      }
    }
    final paymentMethod = _paymentSectionKey.currentState?.orderPaymentMethod ??
        {'type': _paymentType};
    final items = selectedItems.map((i) {
      final entry = <String, dynamic>{
        'productId': i.product.id,
        'quantity': i.quantity,
      };
      final v = i.selectedVariant;
      if (v != null && v.variantId.isNotEmpty) {
        entry['variantId'] = v.variantId;
        entry['selectedAttributes'] = v.attributes;
      }
      return entry;
    }).toList();
    double effectivePriceSubmit(CartItemEntity i) {
      final v = i.selectedVariant;
      if (v != null) {
        final d = v.discount;
        return d != null && d > 0 ? v.price * (1 - d / 100) : v.price;
      }
      final d = i.product.discount;
      return d != null && d > 0
          ? i.product.price * (1 - d / 100)
          : i.product.price;
    }

    final effectiveSubtotal = selectedItems.fold<double>(
        0, (s, i) => s + effectivePriceSubmit(i) * i.quantity);
    final voucherTotal =
        _voucherDiscounts.values.fold<double>(0, (s, d) => s + d);
    final totalShipping = cart.shippingFor(sellerDiscounts: _voucherDiscounts);
    final afterDiscount =
        (effectiveSubtotal - voucherTotal).clamp(0.0, double.infinity);
    final totalTax = afterDiscount * 0.08;
    context.read<OrderBloc>().add(OrderCreateRequested({
          'userId': user.id,
          'items': items,
          'shippingAddress': {
            'street': _streetCtrl.text.trim(),
            'city': _cityCtrl.text.trim(),
            'state': _stateCtrl.text.trim(),
            'zipCode': _zipCtrl.text.trim(),
            'country': 'PH',
          },
          'paymentMethod': paymentMethod,
          'sellerMessages': {
            for (final e in _messageCtrls.entries)
              if (e.value.text.trim().isNotEmpty) e.key: e.value.text.trim(),
          },
          'couponCodes': Map<String, String>.from(_appliedVoucherCodes),
          'deliverySelections': deliverySelections,
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
        }
        if (state.status == OrderStatus.failure) {}
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

            double effectivePrice(CartItemEntity i) {
              final v = i.selectedVariant;
              if (v != null) {
                final d = v.discount;
                return d != null && d > 0 ? v.price * (1 - d / 100) : v.price;
              }
              final d = i.product.discount;
              return d != null && d > 0
                  ? i.product.price * (1 - d / 100)
                  : i.product.price;
            }

            // Gross = selected variant/product raw prices; effective = after discount.
            final grossSubtotal = selectedItems.fold<double>(
                0, (s, i) => s + i.rawPrice * i.quantity);
            final effectiveSubtotal = selectedItems.fold<double>(
                0, (s, i) => s + effectivePrice(i) * i.quantity);
            final productDiscountTotal = grossSubtotal - effectiveSubtotal;
            final voucherTotal =
                _voucherDiscounts.values.fold<double>(0, (s, d) => s + d);
            final totalDiscount = productDiscountTotal + voucherTotal;
            // Voucher applied on top of already-discounted price
            final afterDiscount =
                (effectiveSubtotal - voucherTotal).clamp(0.0, double.infinity);
            double totalShipping = 0;
            double totalTax = 0;
            for (final entry in groups.entries) {
              final grpEffective = entry.value.fold<double>(
                  0, (s, i) => s + effectivePrice(i) * i.quantity);
              final grpVoucher = _voucherDiscounts[entry.key] ?? 0;
              final grpAfter =
                  (grpEffective - grpVoucher).clamp(0.0, double.infinity);
              String? grpFee;
              Map<String, double> grpFeeAmounts = {};
              for (final item in entry.value) {
                grpFee ??= item.product.shippingFee;
                if (grpFeeAmounts.isEmpty) {
                  grpFeeAmounts = item.product.shippingFeeAmounts;
                }
              }
              final selectedOpt = _deliverySelections[entry.key] ??
                  entry.value.first.product.shippingOptions.firstOrNull;
              if (grpFee == 'free') {
                // free — add nothing
              } else if (grpFee == 'buyer_pays') {
                totalShipping +=
                    (selectedOpt != null ? grpFeeAmounts[selectedOpt] : null) ??
                        grpFeeAmounts.values.firstOrNull ??
                        0.0;
              } else {
                totalShipping += grpAfter < 50 ? 9.99 : 0.0;
              }
              totalTax += grpAfter * 0.08;
            }
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
                                p.user?.savedAddresses !=
                                c.user?.savedAddresses,
                            builder: (_, authState) => _AddressSection(
                              key: _addressSectionKey,
                              savedAddresses:
                                  authState.user?.savedAddresses ?? const [],
                              streetCtrl: _streetCtrl,
                              cityCtrl: _cityCtrl,
                              stateCtrl: _stateCtrl,
                              zipCtrl: _zipCtrl,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // ── Seller cards ──────────────────────────────────
                          ...groups.entries.map((entry) {
                            final sellerKey = entry.key;
                            final items = entry.value;
                            final sellerName = items.first.product.sellerName;
                            final groupGross = items.fold<double>(
                                0, (s, i) => s + i.rawPrice * i.quantity);
                            final groupSubtotal = items.fold<double>(0,
                                (s, i) => s + effectivePrice(i) * i.quantity);
                            final groupProductDiscount =
                                groupGross - groupSubtotal;
                            final groupVoucherDiscount =
                                _voucherDiscounts[sellerKey] ?? 0.0;
                            final afterDiscount =
                                (groupSubtotal - groupVoucherDiscount)
                                    .clamp(0.0, double.infinity);

                            // Collect shipping options across all products (union)
                            final shippingOptions = <String>[];
                            String? shippingFee;
                            Map<String, double> shippingFeeAmounts = {};
                            for (final item in items) {
                              for (final opt in item.product.shippingOptions) {
                                if (!shippingOptions.contains(opt)) {
                                  shippingOptions.add(opt);
                                }
                              }
                              shippingFee ??= item.product.shippingFee;
                              if (shippingFeeAmounts.isEmpty) {
                                shippingFeeAmounts =
                                    item.product.shippingFeeAmounts;
                              }
                            }

                            final sellerSelectedOpt =
                                _deliverySelections[sellerKey] ??
                                    shippingOptions.firstOrNull;
                            double sellerShipping;
                            if (shippingFee == 'free') {
                              sellerShipping = 0.0;
                            } else if (shippingFee == 'buyer_pays') {
                              sellerShipping = (sellerSelectedOpt != null
                                      ? shippingFeeAmounts[sellerSelectedOpt]
                                      : null) ??
                                  shippingFeeAmounts.values.firstOrNull ??
                                  0.0;
                            } else {
                              sellerShipping = afterDiscount < 50 ? 9.99 : 0.0;
                            }

                            final sellerTax = afterDiscount * 0.08;
                            final storeTotal =
                                afterDiscount + sellerShipping + sellerTax;

                            return _SellerCard(
                              sellerName: sellerName,
                              items: items,
                              voucherCtrl: _voucherCtrl(sellerKey),
                              messageCtrl: _messageCtrl(sellerKey),
                              grossSubtotal: groupGross,
                              productDiscount: groupProductDiscount,
                              voucherDiscount: groupVoucherDiscount,
                              sellerShipping: sellerShipping,
                              sellerTax: sellerTax,
                              storeTotal: storeTotal,
                              onApplyVoucher: () =>
                                  _applyVoucher(sellerKey, items),
                              onOpenVoucherScreen: () => _openVoucherScreen(
                                sellerKey,
                                sellerName ?? 'Store',
                                groupSubtotal,
                              ),
                              shippingOptions: shippingOptions,
                              selectedDelivery: _deliverySelections[sellerKey],
                              onDeliveryChanged: (opt) => setState(
                                  () => _deliverySelections[sellerKey] = opt),
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
                            grossSubtotal: grossSubtotal,
                            productDiscount: productDiscountTotal,
                            voucherDiscount: voucherTotal,
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

class _AddressSection extends StatefulWidget {
  final List<SavedAddressEntity> savedAddresses;
  final TextEditingController streetCtrl, cityCtrl, stateCtrl, zipCtrl;

  const _AddressSection({
    super.key,
    required this.savedAddresses,
    required this.streetCtrl,
    required this.cityCtrl,
    required this.stateCtrl,
    required this.zipCtrl,
  });

  @override
  State<_AddressSection> createState() => _AddressSectionState();
}

class _AddressSectionState extends State<_AddressSection> {
  late String _selectedId;
  bool _saveAddress = false;

  bool get saveAddress => _saveAddress;
  String get selectedId => _selectedId;

  @override
  void initState() {
    super.initState();
    if (widget.savedAddresses.isNotEmpty) {
      final def = widget.savedAddresses.where((a) => a.isDefault).firstOrNull ??
          widget.savedAddresses.first;
      _selectedId = def.id;
      _fillFromAddress(def);
    } else {
      _selectedId = 'new';
    }
  }

  void _fillFromAddress(SavedAddressEntity addr) {
    widget.streetCtrl.text = addr.street;
    widget.cityCtrl.text = addr.city;
    widget.stateCtrl.text = addr.state;
    widget.zipCtrl.text = addr.zipCode;
  }

  void _clearFields() {
    widget.streetCtrl.clear();
    widget.cityCtrl.clear();
    widget.stateCtrl.clear();
    widget.zipCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: context.surfaceColor,
      padding: const EdgeInsets.fromLTRB(
          AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Section header ────────────────────────────────────────────
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.location_on_rounded,
                    size: 15, color: AppColors.primary),
              ),
              const SizedBox(width: 8),
              Text(
                'Delivery Address',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Saved address cards ───────────────────────────────────────
          ...widget.savedAddresses.map((addr) {
            final subtitle = [addr.street, addr.city, addr.state, addr.zipCode]
                .where((s) => s.isNotEmpty)
                .join(', ');
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _AddressOption(
                label: addr.label,
                subtitle: subtitle.isNotEmpty ? subtitle : 'No address details',
                icon: Icons.home_rounded,
                isDefault: addr.isDefault,
                selected: _selectedId == addr.id,
                onTap: () {
                  setState(() {
                    _selectedId = addr.id;
                    _saveAddress = false;
                  });
                  _fillFromAddress(addr);
                },
              ),
            );
          }),

          // ── New address option ────────────────────────────────────────
          _AddressOption(
            label: 'New Address',
            subtitle: 'Enter a different delivery address',
            icon: Icons.add_location_alt_rounded,
            isDefault: false,
            selected: _selectedId == 'new',
            onTap: () {
              setState(() => _selectedId = 'new');
              _clearFields();
            },
          ),

          // ── New address form ──────────────────────────────────────────
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 220),
            crossFadeState: _selectedId == 'new'
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Column(
                children: [
                  AppTextField(
                    key: keys.orders.checkoutStreetField,
                    label: 'Street Address',
                    controller: widget.streetCtrl,
                    prefixIcon: Icons.home_outlined,
                    keyboardType: TextInputType.streetAddress,
                    textInputAction: TextInputAction.next,
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: AppTextField(
                          key: keys.orders.checkoutCityField,
                          label: 'City',
                          controller: widget.cityCtrl,
                          keyboardType: TextInputType.text,
                          textInputAction: TextInputAction.next,
                          validator: (v) =>
                              v == null || v.trim().isEmpty ? 'Required' : null,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: AppTextField(
                          key: keys.orders.checkoutStateField,
                          label: 'State / Province',
                          controller: widget.stateCtrl,
                          keyboardType: TextInputType.text,
                          textInputAction: TextInputAction.next,
                          validator: (v) =>
                              v == null || v.trim().isEmpty ? 'Required' : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  AppTextField(
                    key: keys.orders.checkoutZipField,
                    label: 'ZIP Code',
                    controller: widget.zipCtrl,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.done,
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => setState(() => _saveAddress = !_saveAddress),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                color: _saveAddress
                                    ? AppColors.primary
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(5),
                                border: Border.all(
                                  color: _saveAddress
                                      ? AppColors.primary
                                      : Colors.grey.shade400,
                                  width: 1.5,
                                ),
                              ),
                              child: _saveAddress
                                  ? const Icon(Icons.check_rounded,
                                      size: 14, color: Colors.white)
                                  : null,
                            ),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                'Save this address to my profile',
                                style: TextStyle(fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AddressOption extends StatelessWidget {
  final String label;
  final String subtitle;
  final IconData icon;
  final bool isDefault;
  final bool selected;
  final VoidCallback onTap;

  const _AddressOption({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.isDefault,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          decoration: BoxDecoration(
            color: selected
                ? AppColors.primary.withValues(alpha: isDark ? 0.15 : 0.06)
                : (isDark
                    ? Colors.white.withValues(alpha: 0.04)
                    : Colors.grey.shade50),
            borderRadius: BorderRadius.circular(AppSizes.radiusMd),
            border: Border.all(
              color: selected
                  ? AppColors.primary
                  : (isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : Colors.grey.shade200),
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              // Radio indicator
              AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: selected ? AppColors.primary : Colors.grey.shade400,
                    width: selected ? 5.5 : 1.5,
                  ),
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 10),
              // Address icon
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: selected
                      ? AppColors.primary.withValues(alpha: 0.12)
                      : (isDark
                          ? Colors.white.withValues(alpha: 0.06)
                          : Colors.grey.shade100),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(
                  icon,
                  size: 17,
                  color: selected ? AppColors.primary : context.onSurfaceMuted,
                ),
              ),
              const SizedBox(width: 10),
              // Text
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: selected
                                  ? AppColors.primary
                                  : context.onSurfaceColor,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isDefault) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'Default',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11,
                        height: 1.4,
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
  final double grossSubtotal;
  final double productDiscount;
  final double voucherDiscount;
  final double sellerShipping;
  final double sellerTax;
  final double storeTotal;
  final VoidCallback onApplyVoucher;
  final VoidCallback onOpenVoucherScreen;
  final List<String> shippingOptions;
  final String? selectedDelivery;
  final ValueChanged<String> onDeliveryChanged;

  const _SellerCard({
    required this.sellerName,
    required this.items,
    required this.voucherCtrl,
    required this.messageCtrl,
    required this.grossSubtotal,
    required this.productDiscount,
    required this.voucherDiscount,
    required this.sellerShipping,
    required this.sellerTax,
    required this.storeTotal,
    required this.onApplyVoucher,
    required this.onOpenVoucherScreen,
    required this.shippingOptions,
    required this.selectedDelivery,
    required this.onDeliveryChanged,
  });

  @override
  Widget build(BuildContext context) {
    final name = sellerName?.isNotEmpty == true ? sellerName! : 'Store';

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

          // Delivery option selector
          if (shippingOptions.isNotEmpty)
            _DeliveryOptionRow(
              options: shippingOptions,
              selected: selectedDelivery ?? shippingOptions.first,
              onChanged: onDeliveryChanged,
            ),

          if (shippingOptions.isNotEmpty) const Divider(height: 1),

          // Shop Voucher row (tapping → voucher screen)
          _VoucherRow(
            controller: voucherCtrl,
            discount: voucherDiscount,
            onApply: onApplyVoucher,
            onTapRow: onOpenVoucherScreen,
          ),

          const Divider(height: 1),

          // Message for seller
          _MessageRow(controller: messageCtrl),
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
              (item.selectedVariant?.image.isNotEmpty == true
                  ? item.selectedVariant!.image
                  : item.product.image),
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
                if (item.selectedVariant != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    item.selectedVariant!.attributes.entries
                        .map((e) => '${e.key}: ${e.value}')
                        .join(' / '),
                    style:
                        TextStyle(fontSize: 11, color: context.onSurfaceMuted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    item.hasDiscount
                        ? RichText(
                            text: TextSpan(
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                              children: [
                                TextSpan(
                                  text: '\$${item.rawPrice.toStringAsFixed(2)}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: context.onSurfaceMuted,
                                    decoration: TextDecoration.lineThrough,
                                  ),
                                ),
                                TextSpan(
                                  text: ' / ',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                    color: context.onSurfaceMuted,
                                  ),
                                ),
                                TextSpan(
                                  text:
                                      '\$${item.effectivePrice.toStringAsFixed(2)}',
                                ),
                              ],
                            ),
                          )
                        : Text(
                            '\$${item.effectivePrice.toStringAsFixed(2)}',
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
  final VoidCallback onTapRow;
  const _VoucherRow({
    required this.controller,
    required this.discount,
    required this.onApply,
    required this.onTapRow,
  });

  @override
  State<_VoucherRow> createState() => _VoucherRowState();
}

class _VoucherRowState extends State<_VoucherRow> {
  final bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        InkWell(
          onTap: widget.onTapRow,
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

  Map<String, dynamic> get orderPaymentMethod {
    if (widget.selected == 'cash-on-delivery') {
      return {'type': 'cash-on-delivery'};
    }
    if (_mode == _CardMode.saved) {
      final card =
          widget.savedCards.where((c) => c.id == _selectedCardId).firstOrNull;
      if (card != null) {
        return {
          'type': card.type,
          'last4': card.last4,
          'cardHolder': card.cardHolder,
        };
      }
    }

    final number = _cardNumberCtrl.text.replaceAll(' ', '');
    return {
      'type': widget.selected,
      if (number.length >= 4) 'last4': number.substring(number.length - 4),
      if (_cardHolderCtrl.text.trim().isNotEmpty)
        'cardHolder': _cardHolderCtrl.text.trim(),
    };
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
      if (!mounted) return;
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      color: context.surfaceColor,
      padding: const EdgeInsets.fromLTRB(
          AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Section header ────────────────────────────────────────────
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.payment_rounded,
                    size: 15, color: AppColors.primary),
              ),
              const SizedBox(width: 8),
              Text(
                'Payment Method',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          _PaymentTypeOptions(
            selected: widget.selected,
            onChanged: widget.onChanged,
          ),
          const SizedBox(height: 12),

          // ── Mode toggle (only when saved cards exist) ──
          if (hasSaved) ...[
            Container(
              height: 38,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.06)
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(children: [
                _ModeChip(
                  label: 'Saved Card',
                  selected: _mode == _CardMode.saved,
                  onTap: () => setState(() => _mode = _CardMode.saved),
                ),
                _ModeChip(
                  key: keys.orders.paymentNewCardTab,
                  label: '+ New Card',
                  selected: _mode == _CardMode.newCard,
                  onTap: () => setState(() => _mode = _CardMode.newCard),
                ),
              ]),
            ),
            const SizedBox(height: 12),
          ],

          // ── Saved card list ──
          if (_mode == _CardMode.saved && hasSaved)
            Column(
              children: widget.savedCards.map((card) {
                final selected = _selectedCardId == card.id;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => setState(() => _selectedCardId = card.id),
                      borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        curve: Curves.easeOut,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 11),
                        decoration: BoxDecoration(
                          color: selected
                              ? AppColors.primary
                                  .withValues(alpha: isDark ? 0.15 : 0.06)
                              : (isDark
                                  ? Colors.white.withValues(alpha: 0.04)
                                  : Colors.grey.shade50),
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusMd),
                          border: Border.all(
                            color: selected
                                ? AppColors.primary
                                : (isDark
                                    ? Colors.white.withValues(alpha: 0.1)
                                    : Colors.grey.shade200),
                            width: selected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(children: [
                          // Radio dot
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: selected
                                    ? AppColors.primary
                                    : Colors.grey.shade400,
                                width: selected ? 5.5 : 1.5,
                              ),
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 10),
                          // Card icon box
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppColors.primary.withValues(alpha: 0.12)
                                  : (isDark
                                      ? Colors.white.withValues(alpha: 0.06)
                                      : Colors.grey.shade100),
                              borderRadius: BorderRadius.circular(9),
                            ),
                            child: Icon(
                              Icons.credit_card_rounded,
                              size: 17,
                              color: selected
                                  ? AppColors.primary
                                  : context.onSurfaceMuted,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${_capitalize(card.type.replaceAll('-', ' '))} •••• ${card.last4}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: selected
                                        ? AppColors.primary
                                        : context.onSurfaceColor,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${card.cardHolder} · ${card.expiryMonth}/${card.expiryYear}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    height: 1.4,
                                    color: context.onSurfaceMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Semantics(
                            label: 'Delete saved card',
                            button: true,
                            child: InkWell(
                              onTap: () => _deleteCard(card.id),
                              borderRadius: BorderRadius.circular(8),
                              child: Padding(
                                padding: const EdgeInsets.all(8),
                                child: Icon(Icons.delete_outline_rounded,
                                    size: 18,
                                    color: Colors.red.withValues(alpha: 0.8)),
                              ),
                            ),
                          ),
                        ]),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

          // ── New card details ──
          if (_mode == _CardMode.newCard &&
              widget.selected != 'cash-on-delivery') ...[
            _CardDetailForm(
              cardNumberCtrl: _cardNumberCtrl,
              cardHolderCtrl: _cardHolderCtrl,
              expiryMonth: _expiryMonth,
              expiryYear: _expiryYear,
              onMonthChanged: (v) => setState(() => _expiryMonth = v),
              onYearChanged: (v) => setState(() => _expiryYear = v),
            ),
            const SizedBox(height: 10),
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => setState(() => _saveCard = !_saveCard),
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                  child: Row(children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color:
                            _saveCard ? AppColors.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(
                          color: _saveCard
                              ? AppColors.primary
                              : Colors.grey.shade400,
                          width: 1.5,
                        ),
                      ),
                      child: _saveCard
                          ? const Icon(Icons.check_rounded,
                              size: 14, color: Colors.white)
                          : null,
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'Save this card for future purchases',
                      style: TextStyle(
                          fontSize: 13, color: context.onSurfaceColor),
                    ),
                  ]),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

class _ModeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ModeChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.25),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: selected
                  ? Colors.white
                  : context.onSurfaceColor.withValues(alpha: 0.6),
            ),
          ),
        ),
      ),
    );
  }
}

class _PaymentTypeOptions extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onChanged;

  const _PaymentTypeOptions({
    required this.selected,
    required this.onChanged,
  });

  static const _options = [
    ('credit-card', 'Credit Card', Icons.credit_card_rounded),
    ('debit-card', 'Debit Card', Icons.payment_rounded),
    ('paypal', 'PayPal', Icons.account_balance_wallet_rounded),
    ('cash-on-delivery', 'Cash on Delivery', Icons.payments_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: _options.map((p) {
        final isSelected = selected == p.$1;
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              key: keys.orders.paymentOption(p.$1),
              onTap: () => onChanged(p.$1),
              borderRadius: BorderRadius.circular(AppSizes.radiusMd),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOut,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary
                          .withValues(alpha: isDark ? 0.15 : 0.06)
                      : (isDark
                          ? Colors.white.withValues(alpha: 0.04)
                          : Colors.grey.shade50),
                  borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : (isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.grey.shade200),
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: Row(children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : Colors.grey.shade400,
                        width: isSelected ? 5.5 : 1.5,
                      ),
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: 0.12)
                          : (isDark
                              ? Colors.white.withValues(alpha: 0.06)
                              : Colors.grey.shade100),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: Icon(p.$3,
                        size: 17,
                        color: isSelected
                            ? AppColors.primary
                            : context.onSurfaceMuted),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    p.$2,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? AppColors.primary
                          : context.onSurfaceColor,
                    ),
                  ),
                ]),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _CardDetailForm extends StatelessWidget {
  final TextEditingController cardNumberCtrl;
  final TextEditingController cardHolderCtrl;
  final String expiryMonth;
  final String expiryYear;
  final ValueChanged<String> onMonthChanged;
  final ValueChanged<String> onYearChanged;

  const _CardDetailForm({
    required this.cardNumberCtrl,
    required this.cardHolderCtrl,
    required this.expiryMonth,
    required this.expiryYear,
    required this.onMonthChanged,
    required this.onYearChanged,
  });

  @override
  Widget build(BuildContext context) {
    final months = List.generate(12, (i) => (i + 1).toString().padLeft(2, '0'));
    final years =
        List.generate(10, (i) => (DateTime.now().year + i).toString());

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 4),
        AppTextField(
          key: keys.orders.checkoutCardNumberField,
          label: 'Card Number',
          controller: cardNumberCtrl,
          keyboardType: TextInputType.number,
          prefixIcon: Icons.credit_card_outlined,
        ),
        const SizedBox(height: 10),
        AppTextField(
          key: keys.orders.checkoutCardHolderField,
          label: 'Cardholder Name',
          controller: cardHolderCtrl,
          prefixIcon: Icons.person_outline,
          keyboardType: TextInputType.name,
          textInputAction: TextInputAction.next,
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
              child: _ExpiryPickerField(
            label: 'Expiry Month',
            value: expiryMonth,
            items: months,
            onChanged: onMonthChanged,
          )),
          const SizedBox(width: 10),
          Expanded(
              child: _ExpiryPickerField(
            label: 'Expiry Year',
            value: expiryYear,
            items: years,
            onChanged: onYearChanged,
          )),
        ]),
      ],
    );
  }
}

class _ExpiryPickerField extends StatelessWidget {
  final String label;
  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;
  const _ExpiryPickerField({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  void _showPicker(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final initialIndex = items.indexOf(value).clamp(0, items.length - 1);
    final controller = FixedExtentScrollController(initialItem: initialIndex);
    final sheetBg = isDark ? const Color(0xFF1C1C2E) : Colors.white;
    final textColor = isDark ? Colors.white : const Color(0xFF111827);
    final mutedColor = isDark
        ? Colors.white.withValues(alpha: 0.28)
        : Colors.black.withValues(alpha: 0.3);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          int tempIndex =
              controller.hasClients ? controller.selectedItem : initialIndex;
          return Container(
            decoration: BoxDecoration(
              color: sheetBg,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Drag handle
                Container(
                  margin: const EdgeInsets.only(top: 10),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: mutedColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 8, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: textColor,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(sheetCtx).pop(),
                        child: Text(
                          'Cancel',
                          style: TextStyle(
                            fontSize: 14,
                            color: mutedColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          onChanged(items[controller.hasClients
                              ? controller.selectedItem
                              : initialIndex]);
                          Navigator.of(sheetCtx).pop();
                        },
                        child: const Text(
                          'Done',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Wheel with highlight band
                SizedBox(
                  height: 240,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Selection highlight band
                      Positioned(
                        top: (240 - 52) / 2,
                        left: 24,
                        right: 24,
                        child: Container(
                          height: 52,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.2),
                            ),
                          ),
                        ),
                      ),
                      ListWheelScrollView.useDelegate(
                        controller: controller,
                        itemExtent: 52,
                        perspective: 0.002,
                        diameterRatio: 2.2,
                        physics: const FixedExtentScrollPhysics(),
                        onSelectedItemChanged: (i) {
                          setModalState(() => tempIndex = i);
                        },
                        childDelegate: ListWheelChildBuilderDelegate(
                          childCount: items.length,
                          builder: (_, i) {
                            final isSelected = i == tempIndex;
                            return Center(
                              child: Text(
                                items[i],
                                style: TextStyle(
                                  fontSize: isSelected ? 22 : 16,
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w400,
                                  color: isSelected
                                      ? AppColors.primary
                                      : mutedColor,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: MediaQuery.of(ctx).padding.bottom + 16),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showPicker(context),
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.04)
                : Colors.grey.shade50,
            borderRadius: BorderRadius.circular(AppSizes.radiusMd),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.grey.shade200,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 11,
                        color: context.onSurfaceMuted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: context.onSurfaceColor,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.expand_more_rounded,
                  size: 20, color: context.onSurfaceMuted),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Order total breakdown ─────────────────────────────────────────────────────

class _TotalBreakdown extends StatelessWidget {
  final double grossSubtotal;
  final double productDiscount;
  final double voucherDiscount;
  final double totalShipping;
  final double totalTax;
  final double grandTotal;
  const _TotalBreakdown({
    required this.grossSubtotal,
    required this.productDiscount,
    required this.voucherDiscount,
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
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.receipt_long_rounded,
                    size: 15, color: AppColors.primary),
              ),
              const SizedBox(width: 8),
              Text(
                'Order Summary',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: context.onSurfaceColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSizes.sm),
          _summaryRow('Merchandise Total',
              '\$${grossSubtotal.toStringAsFixed(2)}', context),
          if (productDiscount > 0) ...[
            const SizedBox(height: 2),
            _summaryRow('Product Discount',
                '-\$${productDiscount.toStringAsFixed(2)}', context,
                valueColor: AppColors.success),
          ],
          if (voucherDiscount > 0) ...[
            const SizedBox(height: 2),
            _summaryRow('Voucher Savings',
                '-\$${voucherDiscount.toStringAsFixed(2)}', context,
                valueColor: AppColors.success),
          ],
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

// ── Delivery option row ───────────────────────────────────────────────────────

class _DeliveryOptionRow extends StatelessWidget {
  final List<String> options;
  final String selected;
  final ValueChanged<String> onChanged;

  const _DeliveryOptionRow({
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  String _label(String opt) {
    switch (opt) {
      case 'express':
        return 'Express';
      case 'pickup':
        return 'Pickup';
      default:
        return 'Standard';
    }
  }

  IconData _icon(String opt) {
    switch (opt) {
      case 'express':
        return Icons.bolt_rounded;
      case 'pickup':
        return Icons.store_rounded;
      default:
        return Icons.local_shipping_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSizes.md, 10, AppSizes.md, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.local_shipping_outlined,
                  size: 14, color: context.onSurfaceMuted),
              const SizedBox(width: 6),
              Text(
                'Delivery Method',
                style: TextStyle(fontSize: 13, color: context.onSurfaceColor),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: options.map((opt) {
              final isSelected = selected == opt;
              final isDark = Theme.of(context).brightness == Brightness.dark;
              return GestureDetector(
                onTap: () => onChanged(opt),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                            .withValues(alpha: isDark ? 0.18 : 0.08)
                        : (isDark
                            ? Colors.white.withValues(alpha: 0.04)
                            : Colors.grey.shade50),
                    borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : (isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : Colors.grey.shade200),
                      width: isSelected ? 1.5 : 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _icon(opt),
                        size: 14,
                        color: isSelected
                            ? AppColors.primary
                            : context.onSurfaceMuted,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _label(opt),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.w400,
                          color: isSelected
                              ? AppColors.primary
                              : context.onSurfaceColor,
                        ),
                      ),
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
              key: keys.orders.placeOrderButton,
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
