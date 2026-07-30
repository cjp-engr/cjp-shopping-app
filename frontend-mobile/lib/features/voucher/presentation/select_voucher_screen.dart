import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/network/api_client.dart';
import '../data/voucher_repository.dart';

/// Result returned when the user confirms a voucher selection.
class VoucherSelection {
  final String code;
  final double discountAmount;
  const VoucherSelection({required this.code, required this.discountAmount});
}

/// Full-screen Shopee-style voucher picker.
/// Push this route and await the result: `VoucherSelection?`.
class SelectVoucherScreen extends StatefulWidget {
  final String sellerId;
  final String sellerName;
  final double orderAmount;
  final String? currentCode;

  const SelectVoucherScreen({
    super.key,
    required this.sellerId,
    required this.sellerName,
    required this.orderAmount,
    this.currentCode,
  });

  @override
  State<SelectVoucherScreen> createState() => _SelectVoucherScreenState();
}

class _SelectVoucherScreenState extends State<SelectVoucherScreen> {
  VoucherRepository? _repo;
  List<VoucherModel> _coupons = [];
  bool _loading = true;

  final _codeCtrl = TextEditingController();
  String? _manualError;
  bool _applyingManual = false;

  String? _selectedCode;
  double _selectedDiscount = 0;

  @override
  void initState() {
    super.initState();
    _selectedCode = widget.currentCode;
    _init();
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    try {
      final client = await ApiClient.get();
      if (!mounted) return;
      _repo = VoucherRepository(client);
      await _load();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _load() async {
    if (_repo == null) return;
    final list = await _repo!.getAvailable(widget.sellerId, widget.orderAmount);
    if (!mounted) return;
    setState(() {
      _coupons = list;
      _loading = false;
    });
  }

  Future<void> _applyManual() async {
    if (_repo == null) return;
    final code = _codeCtrl.text.trim().toUpperCase();
    if (code.isEmpty) return;
    setState(() { _manualError = null; _applyingManual = true; });
    try {
      final result = await _repo!.validate(code, widget.sellerId, widget.orderAmount);
      if (!mounted) return;
      setState(() {
        _selectedCode = result.coupon.code;
        _selectedDiscount = result.discountAmount;
      });
      _confirm();
    } catch (e) {
      if (!mounted) return;
      setState(() { _manualError = e.toString().replaceFirst('Exception: ', ''); });
    } finally {
      if (mounted) setState(() => _applyingManual = false);
    }
  }

  Future<void> _selectCoupon(VoucherModel c) async {
    if (_selectedCode == c.code) {
      setState(() { _selectedCode = null; _selectedDiscount = 0; });
      return;
    }
    if (_repo == null) return;
    try {
      final result = await _repo!.validate(c.code, widget.sellerId, widget.orderAmount);
      if (!mounted) return;
      setState(() {
        _selectedCode = result.coupon.code;
        _selectedDiscount = result.discountAmount;
      });
    } catch (_) {}
  }

  void _confirm() {
    if (_selectedCode != null) {
      Navigator.of(context).pop(
        VoucherSelection(code: _selectedCode!, discountAmount: _selectedDiscount),
      );
    } else {
      Navigator.of(context).pop(null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final surface = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final bg = isDark ? const Color(0xFF121212) : const Color(0xFFF5F5F5);

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(null),
        ),
        title: const Text(AppStrings.selectVoucher, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline_rounded),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Manual code input
          Container(
            color: surface,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _codeCtrl,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          hintText: AppStrings.enterPlatformVoucherHint,
                          hintStyle: TextStyle(fontSize: 13, color: Colors.grey[500]),
                          isDense: true,
                          filled: true,
                          fillColor: isDark ? Colors.grey[800] : Colors.grey[100],
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                        ),
                        style: TextStyle(fontSize: 13, color: isDark ? Colors.white : Colors.black87),
                        onSubmitted: (_) => _applyManual(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton(
                      onPressed: _applyingManual ? null : _applyManual,
                      style: TextButton.styleFrom(
                        backgroundColor: _codeCtrl.text.trim().isEmpty ? Colors.grey[300] : AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: _applyingManual
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text(AppStrings.apply, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    ),
                  ],
                ),
                if (_manualError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(_manualError!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                  ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Coupon list
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _coupons.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.local_offer_outlined, size: 56, color: Colors.grey[300]),
                            const SizedBox(height: 12),
                            Text(AppStrings.noVouchersAvailable, style: TextStyle(color: Colors.grey[500], fontSize: 14)),
                          ],
                        ),
                      )
                    : ListView(
                        padding: const EdgeInsets.only(top: 12, bottom: 100),
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(left: 16, bottom: 8),
                            child: Text(
                              '${widget.sellerName} Vouchers',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[600],
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          ..._coupons.map((c) => _CouponTile(
                                coupon: c,
                                isSelected: _selectedCode == c.code,
                                onTap: () => _selectCoupon(c),
                              )),
                        ],
                      ),
          ),
        ],
      ),

      // Bottom bar
      bottomNavigationBar: Container(
        color: surface,
        padding: EdgeInsets.only(
          left: 16, right: 16, top: 12,
          bottom: MediaQuery.of(context).padding.bottom + 12,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  _selectedCode != null ? AppStrings.voucherSelected : AppStrings.noVoucherSelected,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
                if (_selectedCode != null) ...[
                  const SizedBox(width: 6),
                  const Text(AppStrings.voucherApplied,
                      style: TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w600)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => setState(() { _selectedCode = null; _selectedDiscount = 0; }),
                    child: const Text(AppStrings.remove,
                        style: TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _confirm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text(AppStrings.ok, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Single coupon tile ────────────────────────────────────────────────────────

class _CouponTile extends StatelessWidget {
  final VoucherModel coupon;
  final bool isSelected;
  final VoidCallback onTap;

  const _CouponTile({required this.coupon, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final daysLeft = coupon.daysLeft;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF2A2A2A) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.transparent,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 8,
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
                  color: isSelected ? AppColors.primary : const Color(0xFF26AA99),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(10),
                    bottomLeft: Radius.circular(10),
                  ),
                ),
              ),

              // Icon block
              Container(
                width: 72,
                color: isSelected
                    ? AppColors.primary.withValues(alpha: 0.1)
                    : const Color(0xFF26AA99).withValues(alpha: 0.08),
                child: Center(
                  child: Icon(
                    Icons.local_offer_outlined,
                    size: 32,
                    color: isSelected ? AppColors.primary : const Color(0xFF26AA99),
                  ),
                ),
              ),

              // Content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        coupon.code,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          color: isSelected ? AppColors.primary : const Color(0xFF26AA99),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      if (coupon.discountType == 'percentage' ||
                          coupon.minOrderAmount == 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.orange,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(AppStrings.recommended,
                              style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                        ),
                      const SizedBox(height: 2),
                      Text(
                        coupon.discountLabel,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      if (coupon.minOrderAmount > 0)
                        Text(
                          'Min. Spend \$${coupon.minOrderAmount.toStringAsFixed(2)}',
                          style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                        ),
                      if (coupon.description != null)
                        Text(coupon.description!, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                      if (daysLeft != null)
                        Row(
                          children: [
                            Icon(Icons.access_time, size: 11, color: Colors.grey[500]),
                            const SizedBox(width: 3),
                            Text(
                              daysLeft <= 1 ? 'Expiring: 1 day left' : 'Expires in $daysLeft days',
                              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),

              // Radio indicator
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: isSelected
                    ? const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 22)
                    : Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.grey.shade400, width: 1.5),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
