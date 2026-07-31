import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../shared/services/media_permission_service.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../products/domain/entities/product_entity.dart';
import '../../../products/presentation/bloc/product_bloc.dart';
import '../../../products/presentation/bloc/product_event.dart';
import '../../../products/presentation/bloc/product_state.dart';
import '../bloc/seller_bloc.dart';
import '../bloc/seller_event.dart';
import '../bloc/seller_state.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/app_text_field.dart';

class AddEditProductScreen extends StatefulWidget {
  final ProductEntity? product;
  const AddEditProductScreen({super.key, this.product});

  @override
  State<AddEditProductScreen> createState() => _AddEditProductScreenState();
}

class _AddEditProductScreenState extends State<AddEditProductScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  // Step 0 — Basic Info
  late final TextEditingController _nameCtrl;
  late final TextEditingController _brandCtrl;
  String? _selectedCategory;
  String _condition = 'new';

  // Step 1 — Pricing
  late final TextEditingController _priceCtrl;
  late final TextEditingController _stockCtrl;
  late final TextEditingController _skuCtrl;
  late final TextEditingController _discountCtrl;

  // Step 2 — Description
  late final TextEditingController _descCtrl;
  final TextEditingController _tagCtrl = TextEditingController();
  final List<String> _tags = [];

  // Step 3 — Images
  final List<XFile> _pickedFiles = [];
  late List<String> _existingImageUrls;
  final _picker = ImagePicker();

  // Step 4 — Shipping
  final Set<String> _shippingOptions = {'standard'};
  String _shippingFee = 'free';
  late final TextEditingController _shippingFeeAmountCtrl;

  bool get _isEditing => widget.product != null;

  static const _stepLabels = [
    AppStrings.stepBasicInfo,
    AppStrings.stepPricing,
    AppStrings.stepDescription,
    AppStrings.stepImages,
    AppStrings.stepShipping,
    AppStrings.stepReview,
  ];

  static const _stepIcons = [
    Icons.storefront_outlined,
    Icons.attach_money,
    Icons.notes_outlined,
    Icons.photo_outlined,
    Icons.local_shipping_outlined,
    Icons.fact_check_outlined,
  ];

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameCtrl  = TextEditingController(text: p?.name ?? '');
    _brandCtrl = TextEditingController(text: p?.brand ?? '');
    _priceCtrl = TextEditingController(text: p != null ? p.price.toStringAsFixed(2) : '');
    _stockCtrl = TextEditingController(text: p != null ? '${p.stock}' : '');
    _skuCtrl   = TextEditingController(text: p?.sku ?? '');
    _discountCtrl = TextEditingController(text: p?.discount != null ? '${p!.discount}' : '');
    _descCtrl  = TextEditingController(text: p?.description ?? '');
    _shippingFeeAmountCtrl = TextEditingController(
      text: p?.shippingFeeAmount != null ? '${p!.shippingFeeAmount}' : '',
    );
    _selectedCategory = (p?.category.isNotEmpty == true) ? p!.category : null;
    if (p != null) {
      _condition = p.condition ?? 'new';
      _shippingFee = p.shippingFee ?? 'free';
      if (p.shippingOptions.isNotEmpty) {
        _shippingOptions
          ..clear()
          ..addAll(p.shippingOptions);
      }
      if (p.tags.isNotEmpty) _tags.addAll(p.tags);
    }
    final imgs = p?.images ?? [];
    _existingImageUrls = imgs.isNotEmpty
        ? List<String>.from(imgs)
        : (p?.image.isNotEmpty == true ? [p!.image] : []);
    context.read<ProductBloc>().add(CategoriesLoadRequested());
  }

  @override
  void dispose() {
    _pageController.dispose();
    _nameCtrl.dispose();
    _brandCtrl.dispose();
    _priceCtrl.dispose();
    _stockCtrl.dispose();
    _skuCtrl.dispose();
    _discountCtrl.dispose();
    _descCtrl.dispose();
    _tagCtrl.dispose();
    _shippingFeeAmountCtrl.dispose();
    super.dispose();
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  String? _validatePage() {
    switch (_currentPage) {
      case 0:
        if (_nameCtrl.text.trim().isEmpty) return 'Product name is required.';
        if (_selectedCategory == null) return 'Please select a category.';
      case 1:
        if (_priceCtrl.text.trim().isEmpty) return 'Price is required.';
        if (double.tryParse(_priceCtrl.text.trim()) == null) return 'Enter a valid price.';
        if (_stockCtrl.text.trim().isEmpty) return 'Stock quantity is required.';
        if (int.tryParse(_stockCtrl.text.trim()) == null) return 'Enter a valid quantity.';
      case 2:
        if (_descCtrl.text.trim().isEmpty) return 'Description is required.';
      case 3:
        if (_pickedFiles.isEmpty && _existingImageUrls.isEmpty) {
          return 'Please add at least one product image.';
        }
      case 4:
        if (_shippingOptions.isEmpty) return 'Please select at least one delivery option.';
    }
    return null;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  void _nextPage() {
    final error = _validatePage();
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(error),
        backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    if (_currentPage < 5) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _prevPage() {
    if (_currentPage > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      context.pop();
    }
  }

  void _goToPage(int page) {
    _pageController.animateToPage(
      page,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _submit() {
    final data = {
      'name': _nameCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'price': double.parse(_priceCtrl.text.trim()),
      'category': _selectedCategory!,
      'stock': int.parse(_stockCtrl.text.trim()),
      if (_brandCtrl.text.trim().isNotEmpty) 'brand': _brandCtrl.text.trim(),
      'condition': _condition,
      if (_skuCtrl.text.trim().isNotEmpty) 'sku': _skuCtrl.text.trim(),
      if (_discountCtrl.text.trim().isNotEmpty) 'discount': double.tryParse(_discountCtrl.text.trim()),
      if (_tags.isNotEmpty) 'tags': _tags,
      'shippingOptions': _shippingOptions.toList(),
      'shippingFee': _shippingFee,
      if (_shippingFee == 'buyer_pays' && _shippingFeeAmountCtrl.text.trim().isNotEmpty)
        'shippingFeeAmount': double.tryParse(_shippingFeeAmountCtrl.text.trim()),
    };
    final imagePaths = _pickedFiles.map((f) => f.path).toList();
    if (_isEditing) {
      context.read<SellerBloc>().add(
        SellerProductUpdateRequested(widget.product!.id, data, imagePaths: imagePaths),
      );
    } else {
      context.read<SellerBloc>().add(
        SellerProductCreateRequested(data, imagePaths: imagePaths),
      );
    }
  }

  // ── Image helpers ───────────────────────────────────────────────────────────

  Future<void> _pickFromGallery() async {
    final granted = await MediaPermissionService.requestGallery(context);
    if (!granted || !mounted) return;
    final files = await _picker.pickMultiImage(imageQuality: 85);
    if (files.isNotEmpty) setState(() => _pickedFiles.addAll(files));
  }

  Future<void> _pickFromCamera() async {
    final granted = await MediaPermissionService.requestCamera(context);
    if (!granted || !mounted) return;
    final file = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (file != null) setState(() => _pickedFiles.add(file));
  }

  void _showImageSourceSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSizes.sm),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36, height: 4,
                margin: const EdgeInsets.only(bottom: AppSizes.sm),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                leading: _iconBox(Icons.photo_library_outlined),
                title: const Text(AppStrings.chooseFromGallery,
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                onTap: () { Navigator.pop(ctx); _pickFromGallery(); },
              ),
              ListTile(
                leading: _iconBox(Icons.camera_alt_outlined),
                title: const Text(AppStrings.takeAPhoto,
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                onTap: () { Navigator.pop(ctx); _pickFromCamera(); },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _iconBox(IconData icon) => Container(
    width: 40, height: 40,
    decoration: BoxDecoration(
      color: AppColors.primary.withAlpha(18),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Icon(icon, color: AppColors.primary, size: 20),
  );

  void _addTag() {
    final t = _tagCtrl.text.trim();
    if (t.isEmpty || _tags.contains(t)) { _tagCtrl.clear(); return; }
    setState(() { _tags.add(t); _tagCtrl.clear(); });
  }

  // ── Category helpers ────────────────────────────────────────────────────────

  IconData _categoryIcon(String category) {
    final lower = category.toLowerCase();
    if (lower.contains('book') || lower.contains('read')) return Icons.menu_book_outlined;
    if (lower.contains('cloth') || lower.contains('fashion') || lower.contains('wear')) return Icons.checkroom_outlined;
    if (lower.contains('sport') || lower.contains('outdoor') || lower.contains('fitness')) return Icons.sports_basketball_outlined;
    if (lower.contains('electron') || lower.contains('tech') || lower.contains('gadget')) return Icons.devices_outlined;
    if (lower.contains('food') || lower.contains('grocery') || lower.contains('snack')) return Icons.lunch_dining_outlined;
    if (lower.contains('beauty') || lower.contains('cosmetic') || lower.contains('skin')) return Icons.face_retouching_natural_outlined;
    if (lower.contains('home') || lower.contains('furniture') || lower.contains('decor')) return Icons.chair_outlined;
    if (lower.contains('toy') || lower.contains('game') || lower.contains('kids')) return Icons.toys_outlined;
    if (lower.contains('health') || lower.contains('pharma') || lower.contains('medical')) return Icons.health_and_safety_outlined;
    if (lower.contains('auto') || lower.contains('car') || lower.contains('vehicle')) return Icons.directions_car_outlined;
    return Icons.label_outlined;
  }

  void _showCategorySheet(BuildContext context, List<String> categories) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, _) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36, height: 4,
                margin: const EdgeInsets.only(top: AppSizes.sm, bottom: AppSizes.xs),
                decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSizes.md, AppSizes.xs, AppSizes.md, AppSizes.sm),
                child: Text(AppStrings.selectCategory,
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: context.onSurfaceColor)),
              ),
              for (final cat in categories)
                ListTile(
                  leading: Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(
                      color: _selectedCategory == cat ? AppColors.primary.withAlpha(20) : context.surfaceVariantColor,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(_categoryIcon(cat),
                        color: _selectedCategory == cat ? AppColors.primary : context.onSurfaceMuted,
                        size: 20),
                  ),
                  title: Text(cat, style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w600,
                    color: _selectedCategory == cat ? AppColors.primary : context.onSurfaceColor,
                  )),
                  trailing: _selectedCategory == cat
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20)
                      : null,
                  onTap: () { setState(() => _selectedCategory = cat); Navigator.pop(ctx); },
                ),
              const SizedBox(height: AppSizes.sm),
            ],
          ),
        ),
      ),
    );
  }

  // ── Build ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        title: Text(_isEditing ? AppStrings.editProduct : AppStrings.createNewListing),
      ),
      body: BlocListener<SellerBloc, SellerState>(
        listenWhen: (p, c) => p.status != c.status,
        listener: (context, state) {
          if (state.status == SellerStatus.success) context.pop();
        },
        child: Column(
          children: [
            _WizardStepper(currentStep: _currentPage, labels: _stepLabels, icons: _stepIcons),
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (i) => setState(() => _currentPage = i),
                children: [
                  _buildPage0(),
                  _buildPage1(),
                  _buildPage2(),
                  _buildPage3(),
                  _buildPage4(),
                  _buildPage5(),
                ],
              ),
            ),
            _buildNavBar(),
          ],
        ),
      ),
    );
  }

  // ── Step 0: Basic Info ──────────────────────────────────────────────────────

  Widget _buildPage0() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(title: AppStrings.stepBasicInfo, subtitle: 'Tell buyers about your product'),
          const SizedBox(height: AppSizes.md),
          _FormCard(child: Column(children: [
            AppTextField(
              label: AppStrings.productName,
              controller: _nameCtrl,
              prefixIcon: Icons.inventory_2_outlined,
            ),
            const SizedBox(height: AppSizes.sm),
            BlocBuilder<ProductBloc, ProductState>(
              buildWhen: (p, c) => p.categories != c.categories,
              builder: (context, state) {
                final categories = state.categories;
                if (_selectedCategory != null && !categories.contains(_selectedCategory)) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted) setState(() => _selectedCategory = null);
                  });
                }
                return GestureDetector(
                  onTap: () => _showCategorySheet(context, categories),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    decoration: BoxDecoration(
                      border: Border.all(color: context.borderColor),
                      borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                    ),
                    child: Row(children: [
                      Icon(
                        _selectedCategory != null ? _categoryIcon(_selectedCategory!) : Icons.category_outlined,
                        color: _selectedCategory != null ? AppColors.primary : context.onSurfaceMuted,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(
                        _selectedCategory ?? AppStrings.selectCategory,
                        style: TextStyle(
                          fontSize: 14,
                          color: _selectedCategory != null ? context.onSurfaceColor : context.onSurfaceMuted,
                        ),
                      )),
                      Icon(Icons.keyboard_arrow_down_rounded, color: context.onSurfaceMuted, size: 22),
                    ]),
                  ),
                );
              },
            ),
            const SizedBox(height: AppSizes.sm),
            AppTextField(
              label: AppStrings.brandOptional,
              controller: _brandCtrl,
              prefixIcon: Icons.storefront_outlined,
            ),
          ])),
          const SizedBox(height: AppSizes.md),
          const _SectionLabel(AppStrings.condition),
          const SizedBox(height: AppSizes.xs),
          Row(children: [
            Expanded(child: _ConditionCard(
              label: AppStrings.brandNew, icon: Icons.fiber_new_outlined,
              selected: _condition == 'new',
              onTap: () => setState(() => _condition = 'new'),
            )),
            const SizedBox(width: AppSizes.sm),
            Expanded(child: _ConditionCard(
              label: AppStrings.usedCondition, icon: Icons.history_outlined,
              selected: _condition == 'used',
              onTap: () => setState(() => _condition = 'used'),
            )),
          ]),
        ],
      ),
    );
  }

  // ── Step 1: Pricing ─────────────────────────────────────────────────────────

  Widget _buildPage1() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(title: AppStrings.stepPricing, subtitle: AppStrings.pricingSubtitle),
          const SizedBox(height: AppSizes.md),
          _FormCard(child: Column(children: [
            AppTextField(
              label: AppStrings.priceLabel,
              controller: _priceCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              prefixIcon: Icons.attach_money,
            ),
            const SizedBox(height: AppSizes.sm),
            AppTextField(
              label: AppStrings.stock,
              controller: _stockCtrl,
              keyboardType: TextInputType.number,
              prefixIcon: Icons.warehouse_outlined,
            ),
            const SizedBox(height: AppSizes.sm),
            AppTextField(
              label: AppStrings.skuOptional,
              controller: _skuCtrl,
              prefixIcon: Icons.qr_code_outlined,
            ),
            const SizedBox(height: AppSizes.sm),
            AppTextField(
              label: AppStrings.discountOptional,
              controller: _discountCtrl,
              keyboardType: TextInputType.number,
              prefixIcon: Icons.percent_outlined,
            ),
          ])),
          const SizedBox(height: AppSizes.md),
          AnimatedBuilder(
            animation: Listenable.merge([_priceCtrl, _discountCtrl, _stockCtrl]),
            builder: (context, _) => _PricingComputedCard(
              price: double.tryParse(_priceCtrl.text.trim()) ?? 0,
              stock: int.tryParse(_stockCtrl.text.trim()) ?? 0,
              discount: double.tryParse(_discountCtrl.text.trim()) ?? 0,
            ),
          ),
        ],
      ),
    );
  }

  // ── Step 2: Description ─────────────────────────────────────────────────────

  Widget _buildPage2() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(title: AppStrings.stepDescription, subtitle: 'Describe your product to buyers'),
          const SizedBox(height: AppSizes.md),
          _FormCard(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppTextField(
                label: AppStrings.description,
                controller: _descCtrl,
                maxLines: 5,
                maxLength: 200,
              ),
              const SizedBox(height: AppSizes.sm),
              Text(AppStrings.tags, style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600,
                color: context.onSurfaceColor,
              )),
              const SizedBox(height: AppSizes.xs),
              Row(children: [
                Expanded(child: AppTextField(
                  label: AppStrings.addTag,
                  controller: _tagCtrl,
                  onFieldSubmitted: (_) => _addTag(),
                  textInputAction: TextInputAction.done,
                )),
                const SizedBox(width: AppSizes.sm),
                GestureDetector(
                  onTap: _addTag,
                  child: Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                    ),
                    child: const Icon(Icons.add, color: Colors.white, size: 22),
                  ),
                ),
              ]),
              if (_tags.isNotEmpty) ...[
                const SizedBox(height: AppSizes.xs),
                Wrap(
                  spacing: 8, runSpacing: 8,
                  children: _tags.map((t) => Chip(
                    label: Text(t, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    backgroundColor: AppColors.primary.withAlpha(20),
                    labelStyle: const TextStyle(color: AppColors.primary),
                    deleteIcon: const Icon(Icons.close, size: 14),
                    deleteIconColor: AppColors.primary,
                    onDeleted: () => setState(() => _tags.remove(t)),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    padding: EdgeInsets.zero,
                  )).toList(),
                ),
              ],
            ],
          )),
        ],
      ),
    );
  }

  // ── Step 3: Images ──────────────────────────────────────────────────────────

  Widget _buildPage3() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(title: AppStrings.stepImages, subtitle: 'Add photos to showcase your product'),
          const SizedBox(height: AppSizes.md),
          _FormCard(child: _MultiImagePicker(
            existingUrls: _existingImageUrls,
            files: _pickedFiles,
            onAdd: _showImageSourceSheet,
            onRemoveExisting: (i) => setState(() => _existingImageUrls.removeAt(i)),
            onRemove: (i) => setState(() => _pickedFiles.removeAt(i)),
          )),
        ],
      ),
    );
  }

  // ── Step 4: Shipping ────────────────────────────────────────────────────────

  Widget _buildPage4() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(title: AppStrings.stepShipping, subtitle: 'Set delivery options for buyers'),
          const SizedBox(height: AppSizes.md),
          const _SectionLabel(AppStrings.deliveryOption),
          const SizedBox(height: AppSizes.xs),
          Text(
            'Select all that apply — buyers choose one at checkout',
            style: TextStyle(fontSize: 11, color: context.onSurfaceMuted),
          ),
          const SizedBox(height: AppSizes.sm),
          ...([
            ('standard', AppStrings.standardDelivery, '3–7 business days', Icons.local_shipping_outlined),
            ('express',  AppStrings.expressDelivery,  '1–2 business days', Icons.electric_bolt_outlined),
            ('pickup',   AppStrings.pickup,            'Buyer collects in person', Icons.storefront_outlined),
          ]).map((o) => Padding(
            padding: const EdgeInsets.only(bottom: AppSizes.xs),
            child: _ShippingOptionCard(
              label: o.$2, subtitle: o.$3, icon: o.$4,
              checked: _shippingOptions.contains(o.$1),
              onTap: () => setState(() {
                if (_shippingOptions.contains(o.$1)) {
                  _shippingOptions.remove(o.$1);
                } else {
                  _shippingOptions.add(o.$1);
                }
              }),
            ),
          )),
          const SizedBox(height: AppSizes.md),
          const _SectionLabel(AppStrings.shippingFee),
          const SizedBox(height: AppSizes.xs),
          Row(children: [
            Expanded(child: _ShippingFeeCard(
              label: AppStrings.freeShipping,
              subtitle: 'You absorb the cost',
              selected: _shippingFee == 'free',
              onTap: () => setState(() => _shippingFee = 'free'),
            )),
            const SizedBox(width: AppSizes.sm),
            Expanded(child: _ShippingFeeCard(
              label: AppStrings.feeByBuyer,
              subtitle: 'Added at checkout',
              selected: _shippingFee == 'buyer_pays',
              onTap: () => setState(() => _shippingFee = 'buyer_pays'),
            )),
          ]),
          if (_shippingFee == 'buyer_pays') ...[
            const SizedBox(height: AppSizes.md),
            _FormCard(child: AppTextField(
              label: AppStrings.shippingFeeAmount,
              controller: _shippingFeeAmountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              prefixIcon: Icons.attach_money,
              hint: '0.00',
            )),
          ],
        ],
      ),
    );
  }

  // ── Step 5: Review ──────────────────────────────────────────────────────────

  Widget _buildPage5() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(title: AppStrings.reviewListing, subtitle: 'Make sure everything looks right'),
          const SizedBox(height: AppSizes.md),
          _FormCard(child: Column(
            children: [
              _ReviewRow(label: AppStrings.productName, value: _nameCtrl.text.isEmpty ? '—' : _nameCtrl.text, onEdit: () => _goToPage(0)),
              _ReviewRow(label: AppStrings.categories, value: _selectedCategory ?? '—', onEdit: () => _goToPage(0)),
              _ReviewRow(label: AppStrings.condition, value: _condition == 'new' ? AppStrings.brandNew : AppStrings.usedCondition, onEdit: () => _goToPage(0)),
              if (_brandCtrl.text.isNotEmpty)
                _ReviewRow(label: 'Brand', value: _brandCtrl.text, onEdit: () => _goToPage(0)),
              _ReviewRow(label: AppStrings.priceLabel, value: _priceCtrl.text.isEmpty ? '—' : '\$${_priceCtrl.text}', onEdit: () => _goToPage(1)),
              _ReviewRow(label: AppStrings.stock, value: _stockCtrl.text.isEmpty ? '—' : '${_stockCtrl.text} units', onEdit: () => _goToPage(1)),
              if (_skuCtrl.text.isNotEmpty)
                _ReviewRow(label: 'SKU', value: _skuCtrl.text, onEdit: () => _goToPage(1)),
              if (_discountCtrl.text.isNotEmpty)
                _ReviewRow(label: 'Discount', value: '${_discountCtrl.text}% off', onEdit: () => _goToPage(1)),
              _ReviewRow(
                label: AppStrings.description,
                value: _descCtrl.text.isEmpty ? '—' : (_descCtrl.text.length > 80 ? '${_descCtrl.text.substring(0, 80)}…' : _descCtrl.text),
                onEdit: () => _goToPage(2),
              ),
              if (_tags.isNotEmpty)
                _ReviewRow(label: AppStrings.tags, value: _tags.join(', '), onEdit: () => _goToPage(2)),
              _ReviewRow(
                label: AppStrings.productImages,
                value: '${_pickedFiles.length + _existingImageUrls.length} photo(s)',
                onEdit: () => _goToPage(3),
              ),
              _ReviewRow(
                label: AppStrings.deliveryOption,
                value: _shippingOptions.isEmpty
                    ? '—'
                    : _shippingOptions.map((o) => o[0].toUpperCase() + o.substring(1)).join(', '),
                onEdit: () => _goToPage(4),
              ),
              _ReviewRow(
                label: AppStrings.shippingFee,
                value: _shippingFee == 'free'
                    ? AppStrings.freeShipping
                    : (_shippingFeeAmountCtrl.text.trim().isNotEmpty
                        ? '${AppStrings.feeByBuyer} \$${_shippingFeeAmountCtrl.text.trim()}'
                        : AppStrings.feeByBuyer),
                onEdit: () => _goToPage(4),
                last: true,
              ),
            ],
          )),
        ],
      ),
    );
  }

  // ── Nav bar ─────────────────────────────────────────────────────────────────

  Widget _buildNavBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(AppSizes.md, AppSizes.sm, AppSizes.md, AppSizes.md),
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border(top: BorderSide(color: context.borderColor.withAlpha(80))),
      ),
      child: SafeArea(
        top: false,
        child: Row(children: [
          Expanded(child: AppButton(
            label: _currentPage == 0 ? AppStrings.cancel : 'Back',
            outline: true,
            onPressed: _prevPage,
          )),
          const SizedBox(width: AppSizes.sm),
          if (_currentPage < 5)
            Expanded(child: AppButton(label: 'Next', onPressed: _nextPage))
          else
            Expanded(
              child: BlocBuilder<SellerBloc, SellerState>(
                buildWhen: (p, c) => p.status != c.status,
                builder: (context, state) => AppButton(
                  label: _isEditing ? AppStrings.saveChanges : AppStrings.publishListing,
                  loading: state.status == SellerStatus.saving,
                  onPressed: _submit,
                ),
              ),
            ),
        ]),
      ),
    );
  }
}

// ── Wizard stepper ────────────────────────────────────────────────────────────

class _WizardStepper extends StatelessWidget {
  final int currentStep;
  final List<String> labels;
  final List<IconData> icons;
  const _WizardStepper({required this.currentStep, required this.labels, required this.icons});

  @override
  Widget build(BuildContext context) {
    final total = labels.length;
    return Container(
      padding: const EdgeInsets.fromLTRB(AppSizes.md, 10, AppSizes.md, 10),
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border(bottom: BorderSide(color: context.borderColor.withAlpha(80))),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          for (int i = 0; i < total; i++) ...[
            if (i > 0)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: BoxDecoration(
                    color: i <= currentStep
                        ? AppColors.primary
                        : context.borderColor.withAlpha(80),
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
            _StepNode(
              index: i,
              current: currentStep,
              label: labels[i],
              icon: icons[i],
            ),
          ],
        ],
      ),
    );
  }
}

class _StepNode extends StatelessWidget {
  final int index;
  final int current;
  final String label;
  final IconData icon;
  const _StepNode({required this.index, required this.current, required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    final isActive = index == current;
    final isCompleted = index < current;

    if (isActive) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
        ),
      );
    }

    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isCompleted ? AppColors.primary : Colors.transparent,
        border: isCompleted ? null : Border.all(color: context.borderColor.withAlpha(120)),
      ),
      child: Icon(
        isCompleted ? Icons.check_rounded : icon,
        size: 13,
        color: isCompleted ? Colors.white : context.onSurfaceMuted,
      ),
    );
  }
}

// ── Pricing computed card ─────────────────────────────────────────────────────

class _PricingComputedCard extends StatelessWidget {
  final double price;
  final int stock;
  final double discount;
  const _PricingComputedCard({required this.price, required this.stock, required this.discount});

  @override
  Widget build(BuildContext context) {
    if (price <= 0) return const SizedBox.shrink();
    final hasDiscount = discount > 0 && discount <= 100;
    final finalPrice = hasDiscount ? price - (price * discount / 100) : price;
    final totalValue = finalPrice * stock;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSizes.md),
      decoration: BoxDecoration(
        color: AppColors.primary.withAlpha(10),
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        border: Border.all(color: AppColors.primary.withAlpha(40)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(children: [
            Icon(Icons.calculate_outlined, size: 14, color: AppColors.primary),
            SizedBox(width: 6),
            Text('Price Breakdown', style: TextStyle(
              fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary,
            )),
          ]),
          const SizedBox(height: AppSizes.sm),
          _CalcRow(label: AppStrings.unitPrice, value: '\$${price.toStringAsFixed(2)}'),
          if (hasDiscount) ...[
            _CalcRow(label: AppStrings.discountOptional, value: '-${discount.toStringAsFixed(0)}%', muted: true),
            const Divider(height: 16),
            _CalcRow(
              label: AppStrings.afterDiscount,
              value: '\$${finalPrice.toStringAsFixed(2)}',
              highlighted: true,
            ),
          ],
          if (stock > 0) ...[
            if (!hasDiscount) const Divider(height: 16),
            _CalcRow(
              label: AppStrings.totalStockValue,
              value: '\$${totalValue.toStringAsFixed(2)}',
              highlighted: !hasDiscount,
              muted: hasDiscount,
            ),
          ],
        ],
      ),
    );
  }
}

class _CalcRow extends StatelessWidget {
  final String label;
  final String value;
  final bool highlighted;
  final bool muted;
  const _CalcRow({required this.label, required this.value, this.highlighted = false, this.muted = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(
            fontSize: highlighted ? 13 : 12,
            fontWeight: highlighted ? FontWeight.w700 : FontWeight.w500,
            color: muted ? context.onSurfaceMuted : context.onSurfaceColor,
          )),
          Text(value, style: TextStyle(
            fontSize: highlighted ? 14 : 12,
            fontWeight: highlighted ? FontWeight.w800 : FontWeight.w600,
            color: highlighted ? AppColors.primary : (muted ? context.onSurfaceMuted : context.onSurfaceColor),
          )),
        ],
      ),
    );
  }
}

// ── Page header ───────────────────────────────────────────────────────────────

class _PageHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  const _PageHeader({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: context.onSurfaceColor)),
        const SizedBox(height: 2),
        Text(subtitle, style: TextStyle(fontSize: 13, color: context.onSurfaceMuted)),
      ],
    );
  }
}

// ── Section label ─────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Container(
        width: 3, height: 16,
        decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(2)),
      ),
      const SizedBox(width: 8),
      Text(text, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: context.onSurfaceColor, letterSpacing: 0.1)),
    ]);
  }
}

// ── Form card ─────────────────────────────────────────────────────────────────

class _FormCard extends StatelessWidget {
  final Widget child;
  const _FormCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSizes.md),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 12, offset: const Offset(0, 2))],
      ),
      child: child,
    );
  }
}

// ── Condition card ────────────────────────────────────────────────────────────

class _ConditionCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _ConditionCard({required this.label, required this.icon, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(AppSizes.sm),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withAlpha(15) : context.cardColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(color: selected ? AppColors.primary : context.borderColor, width: selected ? 2 : 1),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: selected ? AppColors.primary : context.onSurfaceMuted, size: 22),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: selected ? AppColors.primary : context.onSurfaceColor)),
          ],
        ),
      ),
    );
  }
}

// ── Shipping option card ──────────────────────────────────────────────────────

class _ShippingOptionCard extends StatelessWidget {
  final String label;
  final String subtitle;
  final IconData icon;
  final bool checked;
  final VoidCallback onTap;
  const _ShippingOptionCard({required this.label, required this.subtitle, required this.icon, required this.checked, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(AppSizes.sm),
        decoration: BoxDecoration(
          color: checked ? AppColors.primary.withAlpha(12) : context.cardColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(color: checked ? AppColors.primary : context.borderColor, width: checked ? 2 : 1),
        ),
        child: Row(children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: checked ? AppColors.primary.withAlpha(20) : context.surfaceVariantColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: checked ? AppColors.primary : context.onSurfaceMuted),
          ),
          const SizedBox(width: AppSizes.sm),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: checked ? AppColors.primary : context.onSurfaceColor)),
              Text(subtitle, style: TextStyle(fontSize: 11, color: context.onSurfaceMuted)),
            ],
          )),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 20, height: 20,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(4),
              color: checked ? AppColors.primary : Colors.transparent,
              border: Border.all(
                color: checked ? AppColors.primary : context.borderColor,
                width: 1.5,
              ),
            ),
            child: checked
                ? const Icon(Icons.check_rounded, size: 13, color: Colors.white)
                : null,
          ),
        ]),
      ),
    );
  }
}

// ── Shipping fee card ─────────────────────────────────────────────────────────

class _ShippingFeeCard extends StatelessWidget {
  final String label;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;
  const _ShippingFeeCard({required this.label, required this.subtitle, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(AppSizes.sm),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withAlpha(12) : context.cardColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(color: selected ? AppColors.primary : context.borderColor, width: selected ? 2 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: selected ? AppColors.primary : context.onSurfaceColor)),
            const SizedBox(height: 2),
            Text(subtitle, style: TextStyle(fontSize: 11, color: context.onSurfaceMuted)),
          ],
        ),
      ),
    );
  }
}

// ── Review row ────────────────────────────────────────────────────────────────

class _ReviewRow extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onEdit;
  final bool last;
  const _ReviewRow({required this.label, required this.value, required this.onEdit, this.last = false});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(children: [
          SizedBox(
            width: 90,
            child: Text(label, style: TextStyle(fontSize: 11, color: context.onSurfaceMuted)),
          ),
          Expanded(child: Text(value, style: TextStyle(fontSize: 13, color: context.onSurfaceColor), maxLines: 2, overflow: TextOverflow.ellipsis)),
          GestureDetector(
            onTap: onEdit,
            child: const Text('Edit', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
          ),
        ]),
      ),
      if (!last) Divider(height: 1, color: context.borderColor.withAlpha(80)),
    ]);
  }
}

// ── Multi-image picker ────────────────────────────────────────────────────────

class _MultiImagePicker extends StatelessWidget {
  final List<String> existingUrls;
  final List<XFile> files;
  final VoidCallback onAdd;
  final void Function(int) onRemoveExisting;
  final void Function(int) onRemove;
  const _MultiImagePicker({required this.existingUrls, required this.files, required this.onAdd, required this.onRemoveExisting, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    final total = existingUrls.length + files.length + 1;
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: total,
        separatorBuilder: (_, __) => const SizedBox(width: AppSizes.sm),
        itemBuilder: (_, i) {
          if (i < existingUrls.length) {
            return _NetworkImageTile(url: existingUrls[i], onRemove: () => onRemoveExisting(i));
          }
          final ni = i - existingUrls.length;
          if (ni < files.length) {
            return _ImageTile(file: files[ni], onRemove: () => onRemove(ni));
          }
          return _AddTile(onTap: onAdd);
        },
      ),
    );
  }
}

// ── Add tile ──────────────────────────────────────────────────────────────────

class _AddTile extends StatelessWidget {
  final VoidCallback onTap;
  const _AddTile({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 96, height: 96,
        decoration: BoxDecoration(
          color: AppColors.primary.withAlpha(12),
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(color: AppColors.primary.withAlpha(70), width: 1.5),
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.add_photo_alternate_outlined, size: 28, color: AppColors.primary.withAlpha(200)),
          const SizedBox(height: 5),
          Text(AppStrings.addPhoto, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary.withAlpha(180))),
        ]),
      ),
    );
  }
}

// ── Network image tile ────────────────────────────────────────────────────────

class _NetworkImageTile extends StatelessWidget {
  final String url;
  final VoidCallback onRemove;
  const _NetworkImageTile({required this.url, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
        child: Image.network(url, width: 96, height: 96, fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            width: 96, height: 96, color: AppColors.surfaceVariant,
            child: const Icon(Icons.broken_image_outlined, color: AppColors.textMuted),
          ),
        ),
      ),
      Positioned(
        top: 5, right: 5,
        child: GestureDetector(
          onTap: onRemove,
          child: Container(
            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
            padding: const EdgeInsets.all(3),
            child: const Icon(Icons.close, color: Colors.white, size: 14),
          ),
        ),
      ),
    ]);
  }
}

// ── Local file image tile ─────────────────────────────────────────────────────

class _ImageTile extends StatelessWidget {
  final XFile file;
  final VoidCallback onRemove;
  const _ImageTile({required this.file, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
        child: Image.file(File(file.path), width: 96, height: 96, fit: BoxFit.cover),
      ),
      Positioned(
        top: 5, right: 5,
        child: GestureDetector(
          onTap: onRemove,
          child: Container(
            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
            padding: const EdgeInsets.all(3),
            child: const Icon(Icons.close, color: Colors.white, size: 14),
          ),
        ),
      ),
    ]);
  }
}
