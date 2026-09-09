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
import '../../../../keys.dart';

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
  final List<String> _enteredImageUrls = [];
  final _picker = ImagePicker();

  // Step 4 — Variants
  bool _hasVariants = false;
  final List<_VariantAttr> _variantAttrs = [];
  final List<_VariantRow> _variantRows = [];

  // Step 5 — Shipping
  final Set<String> _shippingOptions = {'standard'};
  String _shippingFee = '';
  final Map<String, TextEditingController> _shippingFeeAmountCtrls = {};

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
    _nameCtrl = TextEditingController(text: p?.name ?? '');
    _brandCtrl = TextEditingController(text: p?.brand ?? '');
    _priceCtrl = TextEditingController(
        text: p != null ? p.price.toStringAsFixed(2) : '');
    _stockCtrl = TextEditingController(text: p != null ? '${p.stock}' : '');
    _skuCtrl = TextEditingController(text: p?.sku ?? '');
    _discountCtrl = TextEditingController(
        text: p?.discount != null ? '${p!.discount}' : '');
    _descCtrl = TextEditingController(text: p?.description ?? '');
    _selectedCategory = (p?.category.isNotEmpty == true) ? p!.category : null;
    if (p != null) {
      _condition = p.condition ?? 'new';
      _shippingFee = p.shippingFee ?? '';
      if (p.shippingOptions.isNotEmpty) {
        _shippingOptions
          ..clear()
          ..addAll(p.shippingOptions);
      }
      if (p.tags.isNotEmpty) _tags.addAll(p.tags);
      if (p.variantAttributes.isNotEmpty) {
        _hasVariants = true;
        for (final attr in p.variantAttributes) {
          _variantAttrs.add(
              _VariantAttr(name: attr.name, values: List.from(attr.values)));
        }
        for (final v in p.variants) {
          _variantRows.add(_VariantRow(
            attributes: Map.from(v.attributes),
            price: v.price > 0 ? v.price.toStringAsFixed(2) : '',
            stock: v.stock > 0 ? '${v.stock}' : '',
            sku: v.sku,
            discount:
                v.discount != null && v.discount! > 0 ? '${v.discount}' : '',
            imageUrls: List<String>.from(v.images),
          ));
        }
      }
    }
    for (final opt in ['standard', 'express', 'pickup']) {
      final existingAmount = p?.shippingFeeAmounts[opt];
      _shippingFeeAmountCtrls[opt] = TextEditingController(
        text: existingAmount != null ? existingAmount.toStringAsFixed(2) : '',
      );
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
    for (final row in _variantRows) {
      row.dispose();
    }
    for (final ctrl in _shippingFeeAmountCtrls.values) {
      ctrl.dispose();
    }
    super.dispose();
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  String? _validatePage() {
    switch (_currentPage) {
      case 0:
        if (_nameCtrl.text.trim().isEmpty) return 'Product name is required.';
        if (_selectedCategory == null) return 'Please select a category.';
      case 1:
        if (_hasVariants) {
          final validAttrs = _variantAttrs
              .where((a) => a.name.trim().isNotEmpty && a.values.isNotEmpty)
              .toList();
          if (validAttrs.isEmpty) {
            return 'Add at least one attribute with values, or disable variants.';
          }
        } else {
          if (_priceCtrl.text.trim().isEmpty) return 'Price is required.';
          if (double.tryParse(_priceCtrl.text.trim()) == null) {
            return 'Enter a valid price.';
          }
          if (_stockCtrl.text.trim().isEmpty) {
            return 'Stock quantity is required.';
          }
          if (int.tryParse(_stockCtrl.text.trim()) == null) {
            return 'Enter a valid quantity.';
          }
        }
      case 2:
        if (_descCtrl.text.trim().isEmpty) return 'Description is required.';
      case 3:
        if (_pickedFiles.isEmpty &&
            _existingImageUrls.isEmpty &&
            _enteredImageUrls.isEmpty) {
          return 'Please add at least one product image.';
        }
      case 4:
        if (_shippingOptions.isEmpty) {
          return 'Please select at least one delivery option.';
        }
        if (_shippingFee.isEmpty) {
          return 'Please select a shipping fee option.';
        }
        if (_shippingFee == 'buyer_pays') {
          for (final opt in _shippingOptions) {
            final val = _shippingFeeAmountCtrls[opt]?.text.trim() ?? '';
            if (val.isEmpty) {
              return 'Enter a shipping fee amount for each selected delivery option.';
            }
            if (double.tryParse(val) == null) {
              return 'Enter a valid fee amount for each delivery option.';
            }
          }
        }
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
      'price': double.tryParse(_priceCtrl.text.trim()) ?? 0.0,
      'category': _selectedCategory!,
      'stock': int.tryParse(_stockCtrl.text.trim()) ?? 0,
      if (_brandCtrl.text.trim().isNotEmpty) 'brand': _brandCtrl.text.trim(),
      'condition': _condition,
      if (_skuCtrl.text.trim().isNotEmpty) 'sku': _skuCtrl.text.trim(),
      if (_discountCtrl.text.trim().isNotEmpty)
        'discount': double.tryParse(_discountCtrl.text.trim()),
      if (_tags.isNotEmpty) 'tags': _tags,
      'shippingOptions': _shippingOptions.toList(),
      'shippingFee': _shippingFee,
      if (_shippingFee == 'buyer_pays')
        'shippingFeeAmounts': {
          for (final opt in _shippingOptions)
            if (_shippingFeeAmountCtrls[opt]?.text.trim().isNotEmpty == true)
              opt: double.tryParse(_shippingFeeAmountCtrls[opt]!.text.trim()) ??
                  0.0,
        },
    };

    if (_hasVariants &&
        _variantAttrs
            .any((a) => a.name.trim().isNotEmpty && a.values.isNotEmpty)) {
      final validAttrs = _variantAttrs
          .where((a) => a.name.trim().isNotEmpty && a.values.isNotEmpty)
          .toList();
      data['variantAttributes'] = validAttrs
          .map((a) => {'name': a.name.trim(), 'values': a.values})
          .toList();
      data['variants'] = _variantRows.map((r) {
        final disc = double.tryParse(r.discountCtrl.text.trim());
        return {
          'attributes': r.attributes,
          'price': double.tryParse(r.priceCtrl.text.trim()) ?? 0.0,
          'stock': int.tryParse(r.stockCtrl.text.trim()) ?? 0,
          'sku': r.skuCtrl.text.trim(),
          'images': r.imageUrls,
          if (disc != null && disc > 0) 'discount': disc,
        };
      }).toList();
      // Base stock = sum of all variant stocks
      final totalStock = _variantRows.fold<int>(
          0, (s, r) => s + (int.tryParse(r.stockCtrl.text.trim()) ?? 0));
      if (totalStock > 0) data['stock'] = totalStock;
      // Base price = min variant price
      final prices = _variantRows
          .map((r) => double.tryParse(r.priceCtrl.text.trim()) ?? 0.0)
          .where((p) => p > 0)
          .toList();
      if (prices.isNotEmpty) {
        data['price'] = prices.reduce((a, b) => a < b ? a : b);
      }
    }

    final imagePaths = _pickedFiles.map((f) => f.path).toList();
    if (_enteredImageUrls.isNotEmpty) {
      data['imageUrls'] = _enteredImageUrls;
    }
    if (_isEditing) {
      context.read<SellerBloc>().add(
            SellerProductUpdateRequested(widget.product!.id, data,
                imagePaths: imagePaths),
          );
    } else {
      context.read<SellerBloc>().add(
            SellerProductCreateRequested(data, imagePaths: imagePaths),
          );
    }
  }

  // ── Variant helpers ─────────────────────────────────────────────────────────

  void _regenerateVariantRows() {
    final validAttrs = _variantAttrs
        .where((a) => a.name.trim().isNotEmpty && a.values.isNotEmpty)
        .toList();

    if (validAttrs.isEmpty) {
      for (final row in _variantRows) {
        row.dispose();
      }
      _variantRows.clear();
      return;
    }

    // Cartesian product of all attribute values
    List<Map<String, String>> combos = [{}];
    for (final attr in validAttrs) {
      final expanded = <Map<String, String>>[];
      for (final combo in combos) {
        for (final value in attr.values) {
          expanded.add({...combo, attr.name: value});
        }
      }
      combos = expanded;
    }

    // Preserve existing price/stock/sku by label
    final existing = {for (final row in _variantRows) row.label: row};

    final newRows = combos.map((combo) {
      final label = combo.values.join(' / ');
      final prev = existing[label];
      return _VariantRow(
        attributes: combo,
        price: prev?.priceCtrl.text ?? '',
        stock: prev?.stockCtrl.text ?? '',
        sku: prev?.skuCtrl.text ?? '',
        discount: prev?.discountCtrl.text ?? '',
        imageUrls: prev?.imageUrls ?? [],
      );
    }).toList();

    // Dispose rows no longer in use
    for (final row in _variantRows) {
      if (!newRows.any((r) => r.label == row.label)) {
        row.dispose();
      }
    }

    _variantRows
      ..clear()
      ..addAll(newRows);
  }

  void _showAddAttributeDialog() {
    final nameCtrl = TextEditingController();
    final valueCtrl = TextEditingController();
    final values = <String>[];

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          void addValue() {
            final v = valueCtrl.text.trim();
            if (v.isEmpty || values.contains(v)) return;
            setDialogState(() {
              values.add(v);
              valueCtrl.clear();
            });
          }

          return AlertDialog(
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSizes.radiusLg)),
            title: const Text('Add Attribute',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      identifier: 'wizard_attr_name_field',
                      child: AppTextField(
                        key: keys.seller.wizardAttrNameField,
                        label: 'Attribute Name',
                        controller: nameCtrl,
                        hint: 'e.g. Color, Size, RAM…',
                        prefixIcon: Icons.tune_outlined,
                      ),
                    ),
                    const SizedBox(height: AppSizes.sm),
                    Row(children: [
                      Expanded(
                          child: Semantics(
                        identifier: 'wizard_attr_add_value_field',
                        child: AppTextField(
                          key: keys.seller.wizardAttrAddValueField,
                          label: 'Add Value',
                          controller: valueCtrl,
                          hint: 'e.g. Red, Small, 8GB…',
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => addValue(),
                        ),
                      )),
                      const SizedBox(width: AppSizes.sm),
                      Semantics(
                        identifier: 'wizard_attr_add_value_button',
                        child: GestureDetector(
                          key: keys.seller.wizardAttrAddValueButton,
                          onTap: addValue,
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius:
                                  BorderRadius.circular(AppSizes.radiusMd),
                            ),
                            child: const Icon(Icons.add, color: Colors.white),
                          ),
                        ),
                      ),
                    ]),
                    if (values.isNotEmpty) ...[
                      const SizedBox(height: AppSizes.sm),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: values
                            .map((v) => Chip(
                                  label: Text(v,
                                      style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600)),
                                  backgroundColor:
                                      AppColors.primary.withAlpha(20),
                                  labelStyle:
                                      const TextStyle(color: AppColors.primary),
                                  deleteIconColor: AppColors.primary,
                                  onDeleted: () =>
                                      setDialogState(() => values.remove(v)),
                                  materialTapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                  padding: EdgeInsets.zero,
                                ))
                            .toList(),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              Semantics(
                identifier: 'wizard_attr_confirm_button',
                child: ElevatedButton(
                  key: keys.seller.wizardAttrConfirmButton,
                  style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary),
                  onPressed: () {
                    final name = nameCtrl.text.trim();
                    if (name.isEmpty || values.isEmpty) return;
                    if (_variantAttrs
                        .any((a) => a.name.toLowerCase() == name.toLowerCase())) {
                      return;
                    }
                    setState(() {
                      _variantAttrs.add(
                          _VariantAttr(name: name, values: List.from(values)));
                      _regenerateVariantRows();
                    });
                    Navigator.pop(ctx);
                  },
                  child: const Text('Add Attribute',
                      style: TextStyle(color: Colors.white)),
                ),
              ),
            ],
          );
        },
      ),
    );
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
    final file =
        await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (file != null) setState(() => _pickedFiles.add(file));
  }

  Future<void> _pickVariantFromGallery(
    _VariantRow row,
    StateSetter setRowState,
  ) async {
    final granted = await MediaPermissionService.requestGallery(context);
    if (!granted || !mounted) return;
    final files = await _picker.pickMultiImage(imageQuality: 85);
    if (files.isEmpty) return;
    await _uploadVariantFiles(files, row, setRowState);
  }

  Future<void> _pickVariantFromCamera(
    _VariantRow row,
    StateSetter setRowState,
  ) async {
    final granted = await MediaPermissionService.requestCamera(context);
    if (!granted || !mounted) return;
    final file =
        await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (file == null) return;
    await _uploadVariantFiles([file], row, setRowState);
  }

  Future<void> _uploadVariantFiles(
    List<XFile> files,
    _VariantRow row,
    StateSetter setRowState,
  ) async {
    for (final file in files) {
      try {
        final url =
            await context.read<SellerBloc>().uploadVariantImage(file.path);
        if (!mounted) return;
        setRowState(() => row.imageUrls.add(url));
        setState(() {});
      } catch (_) {}
    }
  }

  Future<String?> _pickImageSource() {
    return showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
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
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSizes.sm),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Semantics(
                identifier: 'wizard_gallery_option',
                child: ListTile(
                  key: keys.seller.wizardGalleryOption,
                  leading: _iconBox(Icons.photo_library_outlined),
                  title: const Text(AppStrings.chooseFromGallery,
                      style:
                          TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  onTap: () => Navigator.pop(ctx, 'gallery'),
                ),
              ),
              Semantics(
                identifier: 'wizard_camera_option',
                child: ListTile(
                  key: keys.seller.wizardCameraOption,
                  leading: _iconBox(Icons.camera_alt_outlined),
                  title: const Text(AppStrings.takeAPhoto,
                      style:
                          TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  onTap: () => Navigator.pop(ctx, 'camera'),
                ),
              ),
              Semantics(
                identifier: 'wizard_image_link_option',
                child: ListTile(
                  key: keys.seller.wizardImageLinkOption,
                  leading: _iconBox(Icons.link_outlined),
                  title: const Text('Paste image link',
                      style:
                          TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  onTap: () => Navigator.pop(ctx, 'url'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleImageSourcePick({
    required Future<void> Function() onGallery,
    required Future<void> Function() onCamera,
    Future<void> Function()? onUrl,
  }) async {
    final source = await _pickImageSource();
    if (!mounted || source == null) return;
    if (source == 'gallery') {
      await onGallery();
    } else if (source == 'camera') {
      await onCamera();
    } else if (source == 'url' && onUrl != null) {
      await onUrl();
    }
  }

  Future<void> _pickFromUrl() async {
    final url = await showDialog<String>(
      context: context,
      useRootNavigator: true,
      builder: (_) => const _ImageLinkDialog(),
    );
    if (url != null && url.isNotEmpty && mounted) {
      setState(() => _enteredImageUrls.add(url));
    }
  }

  void _showProductImageSourceSheet() {
    _handleImageSourcePick(
      onGallery: _pickFromGallery,
      onCamera: _pickFromCamera,
      onUrl: _pickFromUrl,
    );
  }

  void _showVariantImageSourceSheet(
    _VariantRow row,
    StateSetter setRowState,
  ) {
    _handleImageSourcePick(
      onGallery: () => _pickVariantFromGallery(row, setRowState),
      onCamera: () => _pickVariantFromCamera(row, setRowState),
    );
  }

  Widget _iconBox(IconData icon) => Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppColors.primary.withAlpha(18),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppColors.primary, size: 20),
      );

  void _addTag() {
    final t = _tagCtrl.text.trim();
    if (t.isEmpty || _tags.contains(t)) {
      _tagCtrl.clear();
      return;
    }
    setState(() {
      _tags.add(t);
      _tagCtrl.clear();
    });
  }

  // ── Category helpers ────────────────────────────────────────────────────────

  IconData _categoryIcon(String category) {
    final lower = category.toLowerCase();
    if (lower.contains('book') || lower.contains('read')) {
      return Icons.menu_book_outlined;
    }
    if (lower.contains('cloth') ||
        lower.contains('fashion') ||
        lower.contains('wear')) {
      return Icons.checkroom_outlined;
    }
    if (lower.contains('sport') ||
        lower.contains('outdoor') ||
        lower.contains('fitness')) {
      return Icons.sports_basketball_outlined;
    }
    if (lower.contains('electron') ||
        lower.contains('tech') ||
        lower.contains('gadget')) {
      return Icons.devices_outlined;
    }
    if (lower.contains('food') ||
        lower.contains('grocery') ||
        lower.contains('snack')) {
      return Icons.lunch_dining_outlined;
    }
    if (lower.contains('beauty') ||
        lower.contains('cosmetic') ||
        lower.contains('skin')) {
      return Icons.face_retouching_natural_outlined;
    }
    if (lower.contains('home') ||
        lower.contains('furniture') ||
        lower.contains('decor')) {
      return Icons.chair_outlined;
    }
    if (lower.contains('toy') ||
        lower.contains('game') ||
        lower.contains('kids')) {
      return Icons.toys_outlined;
    }
    if (lower.contains('health') ||
        lower.contains('pharma') ||
        lower.contains('medical')) {
      return Icons.health_and_safety_outlined;
    }
    if (lower.contains('auto') ||
        lower.contains('car') ||
        lower.contains('vehicle')) {
      return Icons.directions_car_outlined;
    }
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
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(
                    top: AppSizes.sm, bottom: AppSizes.xs),
                decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSizes.md, AppSizes.xs, AppSizes.md, AppSizes.sm),
                child: Text(AppStrings.selectCategory,
                    style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: context.onSurfaceColor)),
              ),
              for (final cat in categories)
                Semantics(
                  identifier: 'category_sheet_item_$cat',
                  child: ListTile(
                    key: keys.seller.categorySheetItem(cat),
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _selectedCategory == cat
                          ? AppColors.primary.withAlpha(20)
                          : context.surfaceVariantColor,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(_categoryIcon(cat),
                        color: _selectedCategory == cat
                            ? AppColors.primary
                            : context.onSurfaceMuted,
                        size: 20),
                  ),
                  title: Text(cat,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: _selectedCategory == cat
                            ? AppColors.primary
                            : context.onSurfaceColor,
                      )),
                  trailing: _selectedCategory == cat
                      ? const Icon(Icons.check_circle_rounded,
                          color: AppColors.primary, size: 20)
                      : null,
                    onTap: () {
                      setState(() => _selectedCategory = cat);
                      Navigator.pop(ctx);
                    },
                  ),
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
        title: Text(
            _isEditing ? AppStrings.editProduct : AppStrings.createNewListing),
      ),
      body: BlocListener<SellerBloc, SellerState>(
        listenWhen: (p, c) => p.status != c.status,
        listener: (context, state) {
          if (state.status == SellerStatus.success) context.pop();
        },
        child: Column(
          children: [
            _WizardStepper(
                currentStep: _currentPage,
                labels: _stepLabels,
                icons: _stepIcons),
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
                  _buildPage5Shipping(),
                  _buildPage6Review(),
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
          const _PageHeader(
              title: AppStrings.stepBasicInfo,
              subtitle: 'Tell buyers about your product'),
          const SizedBox(height: AppSizes.md),
          _FormCard(
              child: Column(children: [
            Semantics(
              identifier: 'wizard_product_name_field',
              child: AppTextField(
                key: keys.seller.wizardProductNameField,
                label: AppStrings.productName,
                controller: _nameCtrl,
                prefixIcon: Icons.inventory_2_outlined,
              ),
            ),
            const SizedBox(height: AppSizes.sm),
            BlocBuilder<ProductBloc, ProductState>(
              buildWhen: (p, c) => p.categories != c.categories,
              builder: (context, state) {
                final categories = state.categories;
                if (_selectedCategory != null &&
                    !categories.contains(_selectedCategory)) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (mounted) setState(() => _selectedCategory = null);
                  });
                }
                return Semantics(
                  identifier: 'wizard_category_selector',
                  child: GestureDetector(
                    key: keys.seller.wizardCategorySelector,
                    onTap: () => _showCategorySheet(context, categories),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        border: Border.all(color: context.borderColor),
                        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                      ),
                      child: Row(children: [
                        Icon(
                          _selectedCategory != null
                              ? _categoryIcon(_selectedCategory!)
                              : Icons.category_outlined,
                          color: _selectedCategory != null
                              ? AppColors.primary
                              : context.onSurfaceMuted,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Text(
                          _selectedCategory ?? AppStrings.selectCategory,
                          style: TextStyle(
                            fontSize: 14,
                            color: _selectedCategory != null
                                ? context.onSurfaceColor
                                : context.onSurfaceMuted,
                          ),
                        )),
                        Icon(Icons.keyboard_arrow_down_rounded,
                            color: context.onSurfaceMuted, size: 22),
                      ]),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: AppSizes.sm),
            Semantics(
              identifier: 'wizard_brand_field',
              child: AppTextField(
                key: keys.seller.wizardBrandField,
                label: AppStrings.brandOptional,
                controller: _brandCtrl,
                prefixIcon: Icons.storefront_outlined,
              ),
            ),
          ])),
          const SizedBox(height: AppSizes.md),
          const _SectionLabel(AppStrings.condition),
          const SizedBox(height: AppSizes.xs),
          Row(children: [
            Expanded(
                child: Semantics(
              identifier: 'wizard_brand_new_button',
              child: _ConditionCard(
                key: keys.seller.wizardBrandNewButton,
                label: AppStrings.brandNew,
                icon: Icons.fiber_new_outlined,
                selected: _condition == 'new',
                onTap: () => setState(() => _condition = 'new'),
              ),
            )),
            const SizedBox(width: AppSizes.sm),
            Expanded(
                child: Semantics(
              identifier: 'wizard_used_button',
              child: _ConditionCard(
                key: keys.seller.wizardUsedButton,
                label: AppStrings.usedCondition,
                icon: Icons.history_outlined,
                selected: _condition == 'used',
                onTap: () => setState(() => _condition = 'used'),
              ),
            )),
          ]),
        ],
      ),
    );
  }

  // ── Step 1: Pricing + Variants ──────────────────────────────────────────────

  Widget _buildPage1() {
    return StatefulBuilder(
      builder: (context, setLocalState) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(AppSizes.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _PageHeader(
                  title: AppStrings.stepPricing,
                  subtitle: AppStrings.pricingSubtitle),
              const SizedBox(height: AppSizes.md),

              // Variants toggle
              _FormCard(
                  child: Row(children: [
                Expanded(
                    child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Enable Variants',
                        style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: context.onSurfaceColor)),
                    const SizedBox(height: 2),
                    Text('Let buyers choose from different options',
                        style: TextStyle(
                            fontSize: 12, color: context.onSurfaceMuted)),
                  ],
                )),
                Semantics(
                  identifier: 'wizard_variants_toggle',
                  child: Switch(
                    key: keys.seller.wizardVariantsToggle,
                    value: _hasVariants,
                    onChanged: (val) => setState(() => _hasVariants = val),
                    activeThumbColor: AppColors.primary,
                  ),
                ),
              ])),

              const SizedBox(height: AppSizes.md),

              if (!_hasVariants) ...[
                _FormCard(
                    child: Column(children: [
                  Semantics(
                    identifier: 'wizard_price_field',
                    child: AppTextField(
                      key: keys.seller.wizardPriceField,
                      label: AppStrings.priceLabel,
                      controller: _priceCtrl,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      prefixIcon: Icons.attach_money,
                    ),
                  ),
                  const SizedBox(height: AppSizes.sm),
                  Semantics(
                    identifier: 'wizard_stock_field',
                    child: AppTextField(
                      key: keys.seller.wizardStockField,
                      label: AppStrings.stock,
                      controller: _stockCtrl,
                      keyboardType: TextInputType.number,
                      prefixIcon: Icons.warehouse_outlined,
                    ),
                  ),
                  const SizedBox(height: AppSizes.sm),
                  Semantics(
                    identifier: 'wizard_sku_field',
                    child: AppTextField(
                      key: keys.seller.wizardSkuField,
                      label: AppStrings.skuOptional,
                      controller: _skuCtrl,
                      prefixIcon: Icons.qr_code_outlined,
                    ),
                  ),
                  const SizedBox(height: AppSizes.sm),
                  Semantics(
                    identifier: 'wizard_discount_field',
                    child: AppTextField(
                      key: keys.seller.wizardDiscountField,
                      label: AppStrings.discountOptional,
                      controller: _discountCtrl,
                      keyboardType: TextInputType.number,
                      prefixIcon: Icons.percent_outlined,
                    ),
                  ),
                ])),
                const SizedBox(height: AppSizes.md),
                AnimatedBuilder(
                  animation:
                      Listenable.merge([_priceCtrl, _discountCtrl, _stockCtrl]),
                  builder: (context, _) => _PricingComputedCard(
                    price: double.tryParse(_priceCtrl.text.trim()) ?? 0,
                    stock: int.tryParse(_stockCtrl.text.trim()) ?? 0,
                    discount: double.tryParse(_discountCtrl.text.trim()) ?? 0,
                  ),
                ),
              ] else ...[
                // Attribute section header + Add button
                Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const _SectionLabel('Attributes'),
                      Semantics(
                        identifier: 'wizard_add_attribute_button',
                        child: GestureDetector(
                          key: keys.seller.wizardAddAttributeButton,
                          onTap: _showAddAttributeDialog,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 7),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.add, color: Colors.white, size: 14),
                                  SizedBox(width: 4),
                                  Text('Add',
                                      style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white)),
                                ]),
                          ),
                        ),
                      ),
                    ]),
                const SizedBox(height: AppSizes.sm),

                if (_variantAttrs.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(AppSizes.lg),
                    decoration: BoxDecoration(
                      color: context.surfaceVariantColor,
                      borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                      border:
                          Border.all(color: context.borderColor.withAlpha(60)),
                    ),
                    child: Center(
                        child: Text(
                      'No attributes yet.\nTap "+ Add" to create one (e.g. Color, Size, RAM)',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 12, color: context.onSurfaceMuted),
                    )),
                  )
                else
                  for (int i = 0; i < _variantAttrs.length; i++)
                    _buildAttributeCard(i),

                if (_variantAttrs.any((a) =>
                    a.name.trim().isNotEmpty && a.values.isNotEmpty)) ...[
                  const SizedBox(height: AppSizes.md),
                  Row(children: [
                    const _SectionLabel('Generated Variants'),
                    const SizedBox(width: AppSizes.sm),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha(20),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('${_variantRows.length}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          )),
                    ),
                  ]),
                  const SizedBox(height: 4),
                  Text('Set price, stock, and SKU for each combination',
                      style: TextStyle(
                          fontSize: 11, color: context.onSurfaceMuted)),
                  const SizedBox(height: AppSizes.sm),
                  _buildVariantsTable(),
                ],
              ],
            ],
          ),
        );
      },
    );
  }

  // ── Step 2: Description ─────────────────────────────────────────────────────

  Widget _buildPage2() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(
              title: AppStrings.stepDescription,
              subtitle: 'Describe your product to buyers'),
          const SizedBox(height: AppSizes.md),
          _FormCard(
              child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                identifier: 'wizard_description_field',
                child: AppTextField(
                  key: keys.seller.wizardDescriptionField,
                  label: AppStrings.description,
                  controller: _descCtrl,
                  maxLines: 5,
                  maxLength: 200,
                ),
              ),
              const SizedBox(height: AppSizes.sm),
              Text(AppStrings.tags,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: context.onSurfaceColor,
                  )),
              const SizedBox(height: AppSizes.xs),
              Row(children: [
                Expanded(
                    child: Semantics(
                  identifier: 'wizard_tags_field',
                  child: AppTextField(
                    key: keys.seller.wizardTagsField,
                    label: AppStrings.addTag,
                    controller: _tagCtrl,
                    onFieldSubmitted: (_) => _addTag(),
                    textInputAction: TextInputAction.done,
                  ),
                )),
                const SizedBox(width: AppSizes.sm),
                Semantics(
                  identifier: 'wizard_add_tag_button',
                  child: GestureDetector(
                    key: keys.seller.wizardAddTagButton,
                    onTap: _addTag,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                      ),
                      child: const Icon(Icons.add, color: Colors.white, size: 22),
                    ),
                  ),
                ),
              ]),
              if (_tags.isNotEmpty) ...[
                const SizedBox(height: AppSizes.xs),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _tags
                      .map((t) => Chip(
                            label: Text(t,
                                style: const TextStyle(
                                    fontSize: 12, fontWeight: FontWeight.w600)),
                            backgroundColor: AppColors.primary.withAlpha(20),
                            labelStyle:
                                const TextStyle(color: AppColors.primary),
                            deleteIcon: const Icon(Icons.close, size: 14),
                            deleteIconColor: AppColors.primary,
                            onDeleted: () => setState(() => _tags.remove(t)),
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                            padding: EdgeInsets.zero,
                          ))
                      .toList(),
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
          const _PageHeader(
              title: AppStrings.stepImages,
              subtitle: 'Add photos to showcase your product'),
          const SizedBox(height: AppSizes.md),
          _FormCard(
              child: _MultiImagePicker(
            existingUrls: _existingImageUrls,
            enteredUrls: _enteredImageUrls,
            files: _pickedFiles,
            onAdd: _showProductImageSourceSheet,
            onRemoveExisting: (i) =>
                setState(() => _existingImageUrls.removeAt(i)),
            onRemoveEntered: (i) =>
                setState(() => _enteredImageUrls.removeAt(i)),
            onRemove: (i) => setState(() => _pickedFiles.removeAt(i)),
          )),
        ],
      ),
    );
  }

  // ── Step 4: Variants ────────────────────────────────────────────────────────

  Widget _buildAttributeCard(int i) {
    final attr = _variantAttrs[i];
    return Container(
      margin: const EdgeInsets.only(bottom: AppSizes.sm),
      padding: const EdgeInsets.all(AppSizes.md),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
        border: Border.all(color: context.borderColor.withAlpha(80)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withAlpha(6),
              blurRadius: 8,
              offset: const Offset(0, 1))
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
                color: AppColors.primary, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Expanded(
              child: Text(attr.name,
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: context.onSurfaceColor))),
          GestureDetector(
            onTap: () => setState(() {
              _variantAttrs.removeAt(i);
              _regenerateVariantRows();
            }),
            child: const Icon(Icons.delete_outline_rounded,
                color: AppColors.danger, size: 18),
          ),
        ]),
        const SizedBox(height: AppSizes.xs),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            ...attr.values.map((v) => _ValueChip(
                  label: v,
                  onDelete: () => setState(() {
                    attr.values.remove(v);
                    _regenerateVariantRows();
                  }),
                )),
            _AddValueChip(
              key: ValueKey('add_${attr.name}'),
              onAdd: (newVal) {
                if (newVal.isNotEmpty && !attr.values.contains(newVal)) {
                  setState(() {
                    attr.values.add(newVal);
                    _regenerateVariantRows();
                  });
                }
              },
            ),
          ],
        ),
      ]),
    );
  }

  Widget _buildVariantsTable() {
    return Column(
      children: [
        for (int i = 0; i < _variantRows.length; i++)
          _buildVariantCard(_variantRows[i], i),
      ],
    );
  }

  Widget _buildVariantCard(_VariantRow row, int index) {
    final labelStyle = TextStyle(
      fontSize: 10,
      fontWeight: FontWeight.w600,
      color: context.onSurfaceMuted,
      letterSpacing: 0.3,
    );
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border.all(color: context.borderColor.withAlpha(80)),
        borderRadius: BorderRadius.circular(AppSizes.radiusMd),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header: variant name + badge
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: context.surfaceVariantColor,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(AppSizes.radiusMd),
              topRight: Radius.circular(AppSizes.radiusMd),
            ),
          ),
          child: Row(children: [
            Container(
              width: 6,
              height: 6,
              margin: const EdgeInsets.only(right: 7, top: 1),
              decoration: const BoxDecoration(
                  color: AppColors.primary, shape: BoxShape.circle),
            ),
            Expanded(
              child: Text(
                row.label,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: context.onSurfaceColor),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary.withAlpha(20),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                '#${index + 1}',
                style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary),
              ),
            ),
          ]),
        ),
        // Row 1: Price | Stock | Disc %
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
          child: Row(children: [
            Expanded(
              flex: 4,
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('PRICE (\$)', style: labelStyle),
                    const SizedBox(height: 4),
                    Semantics(
                      identifier: 'wizard_variant_price_field_${row.label}',
                      child: _InlineField(
                          key: keys.seller.wizardVariantPriceField(row.label),
                          ctrl: row.priceCtrl,
                          prefix: '\$',
                          hint: '0.00',
                          numeric: true),
                    ),
                  ]),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 3,
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('STOCK', style: labelStyle),
                    const SizedBox(height: 4),
                    Semantics(
                      identifier: 'wizard_variant_stock_field_${row.label}',
                      child: _InlineField(
                          key: keys.seller.wizardVariantStockField(row.label),
                          ctrl: row.stockCtrl,
                          hint: '0',
                          numeric: true),
                    ),
                  ]),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 3,
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('DISC %', style: labelStyle),
                    const SizedBox(height: 4),
                    Semantics(
                      identifier: 'wizard_variant_discount_field_${row.label}',
                      child: _InlineField(
                          key: keys.seller.wizardVariantDiscountField(row.label),
                          ctrl: row.discountCtrl,
                          suffix: '%',
                          hint: '0',
                          numeric: true),
                    ),
                  ]),
            ),
          ]),
        ),
        // Row 2: SKU full width
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('SKU (OPTIONAL)', style: labelStyle),
            const SizedBox(height: 4),
            Semantics(
              identifier: 'wizard_variant_sku_field_${row.label}',
              child: _InlineField(
                  key: keys.seller.wizardVariantSkuField(row.label),
                  ctrl: row.skuCtrl,
                  hint: 'e.g. SKU-001'),
            ),
          ]),
        ),
        // Sale price preview
        AnimatedBuilder(
          animation: Listenable.merge([row.priceCtrl, row.discountCtrl]),
          builder: (context, _) {
            final price = double.tryParse(row.priceCtrl.text.trim());
            final disc = double.tryParse(row.discountCtrl.text.trim());
            if (price == null || price <= 0 || disc == null || disc <= 0) {
              return const SizedBox.shrink();
            }
            final salePrice = price * (1 - disc / 100);
            return Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(children: [
                const Icon(Icons.local_offer_outlined,
                    size: 13, color: AppColors.success),
                const SizedBox(width: 4),
                Text(
                  'Sale: \$${salePrice.toStringAsFixed(2)}',
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success),
                ),
                const SizedBox(width: 6),
                Text(
                  '\$${price.toStringAsFixed(2)}',
                  style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade400,
                      decoration: TextDecoration.lineThrough),
                ),
                const SizedBox(width: 4),
                Text(
                  '(${disc.toStringAsFixed(0)}% off)',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
              ]),
            );
          },
        ),
        // Variant images section
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              'IMAGES',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: context.onSurfaceMuted,
                letterSpacing: 0.3,
              ),
            ),
            const SizedBox(height: 6),
            StatefulBuilder(
              builder: (ctx, setRowState) {
                return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (row.imageUrls.isNotEmpty)
                        SizedBox(
                          height: 72,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: row.imageUrls.length,
                            itemBuilder: (ctx, imgIdx) {
                              return Stack(children: [
                                Container(
                                  width: 68,
                                  height: 68,
                                  margin: const EdgeInsets.only(right: 6),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: imgIdx == 0
                                          ? AppColors.primary
                                          : context.borderColor.withAlpha(80),
                                      width: imgIdx == 0 ? 2 : 1,
                                    ),
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(7),
                                    child: Image.network(
                                      row.imageUrls[imgIdx],
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Icon(
                                        Icons.broken_image_outlined,
                                        size: 24,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ),
                                ),
                                if (imgIdx == 0)
                                  Positioned(
                                    bottom: 4,
                                    left: 4,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 4, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary,
                                        borderRadius: BorderRadius.circular(3),
                                      ),
                                      child: const Text(
                                        'Cover',
                                        style: TextStyle(
                                            fontSize: 8,
                                            color: Colors.white,
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                  ),
                                Positioned(
                                  top: 0,
                                  right: 6,
                                  child: GestureDetector(
                                    onTap: () {
                                      setRowState(
                                          () => row.imageUrls.removeAt(imgIdx));
                                      setState(() {});
                                    },
                                    child: Container(
                                      width: 18,
                                      height: 18,
                                      decoration: const BoxDecoration(
                                        color: Colors.red,
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.close,
                                          size: 11, color: Colors.white),
                                    ),
                                  ),
                                ),
                                if (imgIdx > 0)
                                  Positioned(
                                    bottom: 4,
                                    left: 4,
                                    child: GestureDetector(
                                      onTap: () {
                                        setRowState(() {
                                          final img =
                                              row.imageUrls.removeAt(imgIdx);
                                          row.imageUrls.insert(imgIdx - 1, img);
                                        });
                                        setState(() {});
                                      },
                                      child: Container(
                                        width: 18,
                                        height: 18,
                                        decoration: BoxDecoration(
                                          color: Colors.black54,
                                          borderRadius:
                                              BorderRadius.circular(3),
                                        ),
                                        child: const Icon(Icons.chevron_left,
                                            size: 12, color: Colors.white),
                                      ),
                                    ),
                                  ),
                                if (imgIdx < row.imageUrls.length - 1)
                                  Positioned(
                                    bottom: 4,
                                    right: 10,
                                    child: GestureDetector(
                                      onTap: () {
                                        setRowState(() {
                                          final img =
                                              row.imageUrls.removeAt(imgIdx);
                                          row.imageUrls.insert(imgIdx + 1, img);
                                        });
                                        setState(() {});
                                      },
                                      child: Container(
                                        width: 18,
                                        height: 18,
                                        decoration: BoxDecoration(
                                          color: Colors.black54,
                                          borderRadius:
                                              BorderRadius.circular(3),
                                        ),
                                        child: const Icon(Icons.chevron_right,
                                            size: 12, color: Colors.white),
                                      ),
                                    ),
                                  ),
                              ]);
                            },
                          ),
                        ),
                      const SizedBox(height: 6),
                      GestureDetector(
                        onTap: () =>
                            _showVariantImageSourceSheet(row, setRowState),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            border: Border.all(
                                color: AppColors.primary.withAlpha(100),
                                width: 1.5),
                            borderRadius: BorderRadius.circular(8),
                            color: AppColors.primary.withAlpha(12),
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            const Icon(Icons.add_photo_alternate_outlined,
                                size: 16, color: AppColors.primary),
                            const SizedBox(width: 6),
                            Text(
                              row.imageUrls.isEmpty ? 'Add Images' : 'Add More',
                              style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary),
                            ),
                          ]),
                        ),
                      ),
                    ]);
              },
            ),
          ]),
        ),
      ]),
    );
  }

  // ── Step 5: Shipping ────────────────────────────────────────────────────────

  Widget _buildPage5Shipping() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(
              title: AppStrings.stepShipping,
              subtitle: 'Set delivery options for buyers'),
          const SizedBox(height: AppSizes.md),
          const _SectionLabel(AppStrings.deliveryOption),
          const SizedBox(height: AppSizes.xs),
          Text(
            'Select all that apply — buyers choose one at checkout',
            style: TextStyle(fontSize: 11, color: context.onSurfaceMuted),
          ),
          const SizedBox(height: AppSizes.sm),
          ...([
            (
              'standard',
              AppStrings.standardDelivery,
              '3–7 business days',
              Icons.local_shipping_outlined,
              keys.seller.wizardStandardButton
            ),
            (
              'express',
              AppStrings.expressDelivery,
              '1–2 business days',
              Icons.electric_bolt_outlined,
              keys.seller.wizardExpressButton
            ),
            (
              'pickup',
              AppStrings.pickup,
              'Buyer collects in person',
              Icons.storefront_outlined,
              keys.seller.wizardPickupButton
            ),
          ]).map((o) => Padding(
                padding: const EdgeInsets.only(bottom: AppSizes.xs),
                child: Semantics(
                  identifier: 'wizard_shipping_option_${o.$1}',
                  child: _ShippingOptionCard(
                    key: o.$5,
                    label: o.$2,
                    subtitle: o.$3,
                    icon: o.$4,
                    checked: _shippingOptions.contains(o.$1),
                    onTap: () => setState(() {
                      if (_shippingOptions.contains(o.$1)) {
                        _shippingOptions.remove(o.$1);
                      } else {
                        _shippingOptions.add(o.$1);
                      }
                    }),
                  ),
                ),
              )),
          const SizedBox(height: AppSizes.md),
          const _SectionLabel(AppStrings.shippingFee),
          const SizedBox(height: AppSizes.xs),
          Row(children: [
            Expanded(
                child: Semantics(
              identifier: 'wizard_free_shipping_button',
              child: _ShippingFeeCard(
                key: keys.seller.wizardFreeShippingButton,
                label: AppStrings.freeShipping,
                subtitle: 'You absorb the cost',
                selected: _shippingFee == 'free',
                onTap: () => setState(() => _shippingFee = 'free'),
              ),
            )),
            const SizedBox(width: AppSizes.sm),
            Expanded(
                child: Semantics(
              identifier: 'wizard_buyer_pays_button',
              child: _ShippingFeeCard(
                key: keys.seller.wizardBuyerPaysButton,
                label: AppStrings.feeByBuyer,
                subtitle: 'Added at checkout',
                selected: _shippingFee == 'buyer_pays',
                onTap: () => setState(() => _shippingFee = 'buyer_pays'),
              ),
            )),
          ]),
          if (_shippingFee == 'buyer_pays') ...[
            const SizedBox(height: AppSizes.md),
            _FormCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Shipping Fee per Delivery Option',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: AppSizes.sm),
                  for (final opt in ['standard', 'express', 'pickup'])
                    if (_shippingOptions.contains(opt)) ...[
                      Row(
                        children: [
                          SizedBox(
                            width: 80,
                            child: Text(
                              opt[0].toUpperCase() + opt.substring(1),
                              style: const TextStyle(fontSize: 13),
                            ),
                          ),
                          Expanded(
                            child: Semantics(
                              identifier: 'wizard_shipping_fee_field_$opt',
                              child: AppTextField(
                                key: keys.seller.wizardShippingFeeField(opt),
                                label: '',
                                controller: _shippingFeeAmountCtrls[opt]!,
                                keyboardType:
                                    const TextInputType.numberWithOptions(
                                        decimal: true),
                                prefixIcon: Icons.attach_money,
                                hint: '0.00',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSizes.xs),
                    ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── Step 6: Review ──────────────────────────────────────────────────────────

  Widget _buildPage6Review() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _PageHeader(
              title: AppStrings.reviewListing,
              subtitle: 'Make sure everything looks right'),
          const SizedBox(height: AppSizes.md),
          _FormCard(
              child: Column(
            children: [
              _ReviewRow(
                  label: AppStrings.productName,
                  value: _nameCtrl.text.isEmpty ? '—' : _nameCtrl.text,
                  onEdit: () => _goToPage(0)),
              _ReviewRow(
                  label: AppStrings.categories,
                  value: _selectedCategory ?? '—',
                  onEdit: () => _goToPage(0)),
              _ReviewRow(
                  label: AppStrings.condition,
                  value: _condition == 'new'
                      ? AppStrings.brandNew
                      : AppStrings.usedCondition,
                  onEdit: () => _goToPage(0)),
              if (_brandCtrl.text.isNotEmpty)
                _ReviewRow(
                    label: 'Brand',
                    value: _brandCtrl.text,
                    onEdit: () => _goToPage(0)),
              _ReviewRow(
                  label: AppStrings.priceLabel,
                  value: _priceCtrl.text.isEmpty ? '—' : '\$${_priceCtrl.text}',
                  onEdit: () => _goToPage(1)),
              _ReviewRow(
                  label: AppStrings.stock,
                  value: _stockCtrl.text.isEmpty
                      ? '—'
                      : '${_stockCtrl.text} units',
                  onEdit: () => _goToPage(1)),
              if (_skuCtrl.text.isNotEmpty)
                _ReviewRow(
                    label: 'SKU',
                    value: _skuCtrl.text,
                    onEdit: () => _goToPage(1)),
              if (_discountCtrl.text.isNotEmpty)
                _ReviewRow(
                    label: 'Discount',
                    value: '${_discountCtrl.text}% off',
                    onEdit: () => _goToPage(1)),
              _ReviewRow(
                label: AppStrings.description,
                value: _descCtrl.text.isEmpty
                    ? '—'
                    : (_descCtrl.text.length > 80
                        ? '${_descCtrl.text.substring(0, 80)}…'
                        : _descCtrl.text),
                onEdit: () => _goToPage(2),
              ),
              if (_tags.isNotEmpty)
                _ReviewRow(
                    label: AppStrings.tags,
                    value: _tags.join(', '),
                    onEdit: () => _goToPage(2)),
              _ReviewRow(
                label: AppStrings.productImages,
                value:
                    '${_pickedFiles.length + _existingImageUrls.length + _enteredImageUrls.length} photo(s)',
                onEdit: () => _goToPage(3),
              ),
              _ReviewRow(
                label: 'Variants',
                value: _hasVariants && _variantRows.isNotEmpty
                    ? '${_variantRows.length} combination(s)'
                    : 'None',
                onEdit: () => _goToPage(1),
              ),
              _ReviewRow(
                label: AppStrings.deliveryOption,
                value: _shippingOptions.isEmpty
                    ? '—'
                    : _shippingOptions
                        .map((o) => o[0].toUpperCase() + o.substring(1))
                        .join(', '),
                onEdit: () => _goToPage(4),
              ),
              _ReviewRow(
                label: AppStrings.shippingFee,
                value: _shippingFee == 'free'
                    ? AppStrings.freeShipping
                    : () {
                        final parts = _shippingOptions
                            .where((o) =>
                                _shippingFeeAmountCtrls[o]
                                    ?.text
                                    .trim()
                                    .isNotEmpty ==
                                true)
                            .map((o) =>
                                '${o[0].toUpperCase()}${o.substring(1)}: \$${_shippingFeeAmountCtrls[o]!.text.trim()}')
                            .toList();
                        return parts.isEmpty
                            ? AppStrings.feeByBuyer
                            : parts.join(', ');
                      }(),
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
      padding: const EdgeInsets.fromLTRB(
          AppSizes.md, AppSizes.sm, AppSizes.md, AppSizes.md),
      decoration: BoxDecoration(
        color: context.cardColor,
        border:
            Border(top: BorderSide(color: context.borderColor.withAlpha(80))),
      ),
      child: SafeArea(
        top: false,
        child: Row(children: [
          Expanded(
              child: AppButton(
            label: _currentPage == 0 ? AppStrings.cancel : 'Back',
            outline: true,
            onPressed: _prevPage,
          )),
          const SizedBox(width: AppSizes.sm),
          if (_currentPage < 5)
            Expanded(
                child: Semantics(
              identifier: 'wizard_next_button',
              child: AppButton(
                  key: keys.seller.wizardNextButton,
                  label: 'Next',
                  onPressed: _nextPage),
            ))
          else
            Expanded(
              child: BlocBuilder<SellerBloc, SellerState>(
                buildWhen: (p, c) => p.status != c.status,
                builder: (context, state) => Semantics(
                  identifier: 'wizard_publish_button',
                  child: AppButton(
                    key: keys.seller.wizardPublishButton,
                    label: _isEditing
                        ? AppStrings.saveChanges
                        : AppStrings.publishListing,
                    loading: state.status == SellerStatus.saving,
                    onPressed: _submit,
                  ),
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
  const _WizardStepper(
      {required this.currentStep, required this.labels, required this.icons});

  @override
  Widget build(BuildContext context) {
    final total = labels.length;
    return Container(
      padding: const EdgeInsets.fromLTRB(AppSizes.md, 10, AppSizes.md, 10),
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border(
            bottom: BorderSide(color: context.borderColor.withAlpha(80))),
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
  const _StepNode(
      {required this.index,
      required this.current,
      required this.label,
      required this.icon});

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
          style: const TextStyle(
              fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
        ),
      );
    }

    return Container(
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isCompleted ? AppColors.primary : Colors.transparent,
        border: isCompleted
            ? null
            : Border.all(color: context.borderColor.withAlpha(120)),
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
  const _PricingComputedCard(
      {required this.price, required this.stock, required this.discount});

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
            Text('Price Breakdown',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                )),
          ]),
          const SizedBox(height: AppSizes.sm),
          _CalcRow(
              label: AppStrings.unitPrice,
              value: '\$${price.toStringAsFixed(2)}'),
          if (hasDiscount) ...[
            _CalcRow(
                label: AppStrings.discountOptional,
                value: '-${discount.toStringAsFixed(0)}%',
                muted: true),
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
  const _CalcRow(
      {required this.label,
      required this.value,
      this.highlighted = false,
      this.muted = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                fontSize: highlighted ? 13 : 12,
                fontWeight: highlighted ? FontWeight.w700 : FontWeight.w500,
                color: muted ? context.onSurfaceMuted : context.onSurfaceColor,
              )),
          Text(value,
              style: TextStyle(
                fontSize: highlighted ? 14 : 12,
                fontWeight: highlighted ? FontWeight.w800 : FontWeight.w600,
                color: highlighted
                    ? AppColors.primary
                    : (muted ? context.onSurfaceMuted : context.onSurfaceColor),
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
        Text(title,
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: context.onSurfaceColor)),
        const SizedBox(height: 2),
        Text(subtitle,
            style: TextStyle(fontSize: 13, color: context.onSurfaceMuted)),
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
        width: 3,
        height: 16,
        decoration: BoxDecoration(
            color: AppColors.primary, borderRadius: BorderRadius.circular(2)),
      ),
      const SizedBox(width: 8),
      Text(text,
          style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: context.onSurfaceColor,
              letterSpacing: 0.1)),
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
        boxShadow: [
          BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 12,
              offset: const Offset(0, 2))
        ],
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

  const _ConditionCard(
      {required this.label,
      required this.icon,
      required this.selected,
      required this.onTap,
      super.key});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        key: key,
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(AppSizes.sm),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withAlpha(15) : context.cardColor,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(
              color: selected ? AppColors.primary : context.borderColor,
              width: selected ? 2 : 1),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                color: selected ? AppColors.primary : context.onSurfaceMuted,
                size: 22),
            const SizedBox(height: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color:
                        selected ? AppColors.primary : context.onSurfaceColor)),
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
  const _ShippingOptionCard({
    super.key,
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.checked,
    required this.onTap,
  });

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
          border: Border.all(
              color: checked ? AppColors.primary : context.borderColor,
              width: checked ? 2 : 1),
        ),
        child: Row(children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: checked
                  ? AppColors.primary.withAlpha(20)
                  : context.surfaceVariantColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon,
                size: 18,
                color: checked ? AppColors.primary : context.onSurfaceMuted),
          ),
          const SizedBox(width: AppSizes.sm),
          Expanded(
              child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                  key: key,
                  label,
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: checked
                          ? AppColors.primary
                          : context.onSurfaceColor)),
              Text(subtitle,
                  style:
                      TextStyle(fontSize: 11, color: context.onSurfaceMuted)),
            ],
          )),
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 20,
            height: 20,
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
  const _ShippingFeeCard(
      {super.key,
      required this.label,
      required this.subtitle,
      required this.selected,
      required this.onTap});

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
          border: Border.all(
              color: selected ? AppColors.primary : context.borderColor,
              width: selected ? 2 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
                key: key,
                label,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color:
                        selected ? AppColors.primary : context.onSurfaceColor)),
            const SizedBox(height: 2),
            Text(subtitle,
                style: TextStyle(fontSize: 11, color: context.onSurfaceMuted)),
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
  const _ReviewRow(
      {required this.label,
      required this.value,
      required this.onEdit,
      this.last = false});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(children: [
          SizedBox(
            width: 90,
            child: Text(label,
                style: TextStyle(fontSize: 11, color: context.onSurfaceMuted)),
          ),
          Expanded(
              child: Text(value,
                  style: TextStyle(fontSize: 13, color: context.onSurfaceColor),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis)),
          GestureDetector(
            onTap: onEdit,
            child: const Text('Edit',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary)),
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
  final List<String> enteredUrls;
  final List<XFile> files;
  final VoidCallback onAdd;
  final void Function(int) onRemoveExisting;
  final void Function(int) onRemoveEntered;
  final void Function(int) onRemove;
  const _MultiImagePicker(
      {required this.existingUrls,
      required this.enteredUrls,
      required this.files,
      required this.onAdd,
      required this.onRemoveExisting,
      required this.onRemoveEntered,
      required this.onRemove});

  @override
  Widget build(BuildContext context) {
    final total = existingUrls.length + enteredUrls.length + files.length + 1;
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: total,
        separatorBuilder: (_, __) => const SizedBox(width: AppSizes.sm),
        itemBuilder: (_, i) {
          if (i < existingUrls.length) {
            return _NetworkImageTile(
                url: existingUrls[i], onRemove: () => onRemoveExisting(i));
          }
          final ei = i - existingUrls.length;
          if (ei < enteredUrls.length) {
            return _NetworkImageTile(
                url: enteredUrls[ei], onRemove: () => onRemoveEntered(ei));
          }
          final ni = ei - enteredUrls.length;
          if (ni < files.length) {
            return _ImageTile(file: files[ni], onRemove: () => onRemove(ni));
          }
          return Semantics(
            identifier: 'wizard_add_image_tile',
            child: _AddTile(key: keys.seller.wizardAddImageTile, onTap: onAdd),
          );
        },
      ),
    );
  }
}

// ── Image link dialog ─────────────────────────────────────────────────────────

class _ImageLinkDialog extends StatefulWidget {
  const _ImageLinkDialog();

  @override
  State<_ImageLinkDialog> createState() => _ImageLinkDialogState();
}

class _ImageLinkDialogState extends State<_ImageLinkDialog> {
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add image link'),
      content: Semantics(
        identifier: 'wizard_image_link_field',
        child: TextField(
          key: keys.seller.wizardImageLinkField,
          controller: _ctrl,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'https://example.com/image.jpg',
          ),
          keyboardType: TextInputType.url,
          onSubmitted: (v) => Navigator.pop(context, v.trim()),
        ),
      ),
      actions: [
        Semantics(
          identifier: 'wizard_image_link_cancel_button',
          child: TextButton(
            key: keys.seller.wizardImageLinkCancelButton,
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ),
        Semantics(
          identifier: 'wizard_image_link_add_button',
          child: TextButton(
            key: keys.seller.wizardImageLinkAddButton,
            onPressed: () => Navigator.pop(context, _ctrl.text.trim()),
            child: const Text('Add'),
          ),
        ),
      ],
    );
  }
}

// ── Add tile ──────────────────────────────────────────────────────────────────

class _AddTile extends StatelessWidget {
  final VoidCallback onTap;
  const _AddTile({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 96,
        height: 96,
        decoration: BoxDecoration(
          color: AppColors.primary.withAlpha(12),
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border:
              Border.all(color: AppColors.primary.withAlpha(70), width: 1.5),
        ),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.add_photo_alternate_outlined,
              size: 28, color: AppColors.primary.withAlpha(200)),
          const SizedBox(height: 5),
          Text(AppStrings.addPhoto,
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary.withAlpha(180))),
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
        child: Image.network(
          url,
          width: 96,
          height: 96,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => Container(
            width: 96,
            height: 96,
            color: AppColors.surfaceVariant,
            child: const Icon(Icons.broken_image_outlined,
                color: AppColors.textMuted),
          ),
        ),
      ),
      Positioned(
        top: 5,
        right: 5,
        child: GestureDetector(
          onTap: onRemove,
          child: Container(
            decoration: const BoxDecoration(
                color: Colors.black54, shape: BoxShape.circle),
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
        child: Image.file(File(file.path),
            width: 96, height: 96, fit: BoxFit.cover),
      ),
      Positioned(
        top: 5,
        right: 5,
        child: GestureDetector(
          onTap: onRemove,
          child: Container(
            decoration: const BoxDecoration(
                color: Colors.black54, shape: BoxShape.circle),
            padding: const EdgeInsets.all(3),
            child: const Icon(Icons.close, color: Colors.white, size: 14),
          ),
        ),
      ),
    ]);
  }
}

// ── Variant helpers ───────────────────────────────────────────────────────────

class _VariantAttr {
  String name;
  List<String> values;
  _VariantAttr({required this.name, List<String>? values})
      : values = values ?? [];
}

class _VariantRow {
  final Map<String, String> attributes;
  final TextEditingController priceCtrl;
  final TextEditingController stockCtrl;
  final TextEditingController skuCtrl;
  final TextEditingController discountCtrl;
  List<String> imageUrls;

  _VariantRow({
    required this.attributes,
    String price = '',
    String stock = '',
    String sku = '',
    String discount = '',
    List<String>? imageUrls,
  })  : imageUrls = imageUrls ?? [],
        priceCtrl = TextEditingController(text: price),
        stockCtrl = TextEditingController(text: stock),
        skuCtrl = TextEditingController(text: sku),
        discountCtrl = TextEditingController(text: discount);

  String get label => attributes.values.join(' / ');

  void dispose() {
    priceCtrl.dispose();
    stockCtrl.dispose();
    skuCtrl.dispose();
    discountCtrl.dispose();
  }
}

// ── Value chip ────────────────────────────────────────────────────────────────

class _ValueChip extends StatelessWidget {
  final String label;
  final VoidCallback onDelete;
  const _ValueChip({required this.label, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 5, 6, 5),
      decoration: BoxDecoration(
        color: AppColors.primary.withAlpha(18),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withAlpha(60)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Text(label,
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.primary)),
        const SizedBox(width: 4),
        GestureDetector(
          onTap: onDelete,
          child: const Icon(Icons.close, size: 13, color: AppColors.primary),
        ),
      ]),
    );
  }
}

// ── Add-value chip (inline input) ─────────────────────────────────────────────

class _AddValueChip extends StatefulWidget {
  final void Function(String) onAdd;
  const _AddValueChip({super.key, required this.onAdd});

  @override
  State<_AddValueChip> createState() => _AddValueChipState();
}

class _AddValueChipState extends State<_AddValueChip> {
  bool _editing = false;
  final _ctrl = TextEditingController();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _submit() {
    final v = _ctrl.text.trim();
    widget.onAdd(v);
    _ctrl.clear();
    setState(() => _editing = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_editing) {
      return SizedBox(
        width: 110,
        child: TextField(
          controller: _ctrl,
          autofocus: true,
          style: const TextStyle(fontSize: 12),
          decoration: InputDecoration(
            isDense: true,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: const BorderSide(color: AppColors.primary)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide:
                    const BorderSide(color: AppColors.primary, width: 1.5)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(20),
                borderSide: const BorderSide(color: AppColors.primary)),
            hintText: 'Value…',
            hintStyle: TextStyle(fontSize: 11, color: context.onSurfaceMuted),
            suffixIcon: GestureDetector(
              onTap: _submit,
              child:
                  const Icon(Icons.check, size: 15, color: AppColors.primary),
            ),
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _submit(),
          onTapOutside: (_) => setState(() {
            _editing = false;
            _ctrl.clear();
          }),
        ),
      );
    }
    return GestureDetector(
      onTap: () => setState(() => _editing = true),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: context.surfaceVariantColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: context.borderColor),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.add, size: 13, color: context.onSurfaceMuted),
          const SizedBox(width: 3),
          Text('Add value',
              style: TextStyle(fontSize: 11, color: context.onSurfaceMuted)),
        ]),
      ),
    );
  }
}

// ── Inline table cell field ───────────────────────────────────────────────────

class _InlineField extends StatelessWidget {
  final TextEditingController ctrl;
  final String hint;
  final String? prefix;
  final String? suffix;
  final bool numeric;
  const _InlineField(
      {super.key,
      required this.ctrl,
      required this.hint,
      this.prefix,
      this.suffix,
      this.numeric = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: TextField(
        controller: ctrl,
        keyboardType: numeric
            ? const TextInputType.numberWithOptions(decimal: true)
            : TextInputType.text,
        style: const TextStyle(fontSize: 12),
        decoration: InputDecoration(
          isDense: true,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: context.borderColor)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppColors.primary)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide:
                  BorderSide(color: context.borderColor.withAlpha(100))),
          prefixText: prefix,
          prefixStyle: TextStyle(fontSize: 12, color: context.onSurfaceMuted),
          suffixText: suffix,
          suffixStyle: TextStyle(fontSize: 12, color: context.onSurfaceMuted),
          hintText: hint,
          hintStyle: TextStyle(fontSize: 11, color: context.onSurfaceMuted),
        ),
      ),
    );
  }
}
