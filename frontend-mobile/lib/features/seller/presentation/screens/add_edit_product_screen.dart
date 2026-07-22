import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
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
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _priceCtrl;
  late final TextEditingController _stockCtrl;
  String? _selectedCategory;

  final List<XFile> _pickedFiles = [];
  late List<String> _existingImageUrls;
  final _picker = ImagePicker();

  bool get _isEditing => widget.product != null;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _nameCtrl = TextEditingController(text: p?.name ?? '');
    _descCtrl = TextEditingController(text: p?.description ?? '');
    _priceCtrl = TextEditingController(
        text: p != null ? p.price.toStringAsFixed(2) : '');
    _stockCtrl = TextEditingController(text: p != null ? '${p.stock}' : '');
    _selectedCategory = (p?.category.isNotEmpty == true) ? p!.category : null;
    final imgs = p?.images ?? [];
    _existingImageUrls = imgs.isNotEmpty
        ? List<String>.from(imgs)
        : (p?.image.isNotEmpty == true ? [p!.image] : []);
    context.read<ProductBloc>().add(CategoriesLoadRequested());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _stockCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickFromGallery() async {
    final files = await _picker.pickMultiImage(imageQuality: 85);
    if (files.isNotEmpty) {
      setState(() => _pickedFiles.addAll(files));
    }
  }

  Future<void> _pickFromCamera() async {
    final file =
        await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (file != null) {
      setState(() => _pickedFiles.add(file));
    }
  }

  IconData _categoryIcon(String category) {
    final lower = category.toLowerCase();
    if (lower.contains('book') || lower.contains('read')) {
      return Icons.menu_book_outlined;
    }
    if (lower.contains('cloth') || lower.contains('fashion') ||
        lower.contains('wear')) {
      return Icons.checkroom_outlined;
    }
    if (lower.contains('sport') || lower.contains('outdoor') ||
        lower.contains('fitness')) {
      return Icons.sports_basketball_outlined;
    }
    if (lower.contains('electron') || lower.contains('tech') ||
        lower.contains('gadget')) {
      return Icons.devices_outlined;
    }
    if (lower.contains('food') || lower.contains('grocery') ||
        lower.contains('snack')) {
      return Icons.lunch_dining_outlined;
    }
    if (lower.contains('beauty') || lower.contains('cosmetic') ||
        lower.contains('skin')) {
      return Icons.face_retouching_natural_outlined;
    }
    if (lower.contains('home') || lower.contains('furniture') ||
        lower.contains('decor')) {
      return Icons.chair_outlined;
    }
    if (lower.contains('toy') || lower.contains('game') ||
        lower.contains('kids')) {
      return Icons.toys_outlined;
    }
    if (lower.contains('health') || lower.contains('pharma') ||
        lower.contains('medical')) {
      return Icons.health_and_safety_outlined;
    }
    if (lower.contains('auto') || lower.contains('car') ||
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
        builder: (ctx, setSheetState) => SafeArea(
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
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSizes.md, AppSizes.xs, AppSizes.md, AppSizes.sm),
                child: Text(
                  'Select Category',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: context.onSurfaceColor,
                  ),
                ),
              ),
              for (final cat in categories)
                ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _selectedCategory == cat
                          ? AppColors.primary.withAlpha(20)
                          : context.surfaceVariantColor,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      _categoryIcon(cat),
                      color: _selectedCategory == cat
                          ? AppColors.primary
                          : context.onSurfaceMuted,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    cat,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: _selectedCategory == cat
                          ? AppColors.primary
                          : context.onSurfaceColor,
                    ),
                  ),
                  trailing: _selectedCategory == cat
                      ? const Icon(Icons.check_circle_rounded,
                          color: AppColors.primary, size: 20)
                      : null,
                  onTap: () {
                    setState(() => _selectedCategory = cat);
                    Navigator.pop(ctx);
                  },
                ),
              const SizedBox(height: AppSizes.sm),
            ],
          ),
        ),
      ),
    );
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
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSizes.sm),
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.photo_library_outlined,
                      color: AppColors.primary, size: 20),
                ),
                title: const Text('Choose from Gallery',
                    style:
                        TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickFromGallery();
                },
              ),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(18),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.camera_alt_outlined,
                      color: AppColors.primary, size: 20),
                ),
                title: const Text('Take a Photo',
                    style:
                        TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickFromCamera();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _removeImage(int index) {
    setState(() => _pickedFiles.removeAt(index));
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final data = {
      'name': _nameCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'price': double.parse(_priceCtrl.text.trim()),
      'category': _selectedCategory!,
      'stock': int.parse(_stockCtrl.text.trim()),
    };

    final imagePaths = _pickedFiles.map((f) => f.path).toList();

    if (_isEditing) {
      context.read<SellerBloc>().add(
            SellerProductUpdateRequested(widget.product!.id, data,
                imagePaths: imagePaths),
          );
    } else {
      context
          .read<SellerBloc>()
          .add(SellerProductCreateRequested(data, imagePaths: imagePaths));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Product' : 'Add Product'),
      ),
      body: BlocListener<SellerBloc, SellerState>(
        listenWhen: (p, c) => p.status != c.status,
        listener: (context, state) {
          if (state.status == SellerStatus.success) {
            context.pop();
          }
          if (state.status == SellerStatus.failure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.errorMessage ?? 'Something went wrong'),
                backgroundColor: AppColors.danger,
                duration: const Duration(seconds: 2),
              ),
            );
          }
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSizes.md),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Product Details card ─────────────────────────────────────
                _SectionLabel('Product Details'),
                const SizedBox(height: AppSizes.xs),
                _FormCard(
                  child: Column(
                    children: [
                      AppTextField(
                        label: 'Product Name',
                        controller: _nameCtrl,
                        prefixIcon: Icons.inventory_2_outlined,
                        validator: (v) =>
                            v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: AppSizes.sm),
                      AppTextField(
                        label: 'Description',
                        controller: _descCtrl,
                        maxLines: 3,
                        maxLength: 200,
                        validator: (v) =>
                            v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: AppSizes.sm),
                      Row(
                        children: [
                          Expanded(
                            child: AppTextField(
                              label: 'Price (\$)',
                              controller: _priceCtrl,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                      decimal: true),
                              prefixIcon: Icons.attach_money,
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  return 'Required';
                                }
                                if (double.tryParse(v.trim()) == null) {
                                  return 'Invalid price';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: AppSizes.sm),
                          Expanded(
                            child: AppTextField(
                              label: 'Stock',
                              controller: _stockCtrl,
                              keyboardType: TextInputType.number,
                              prefixIcon: Icons.warehouse_outlined,
                              validator: (v) {
                                if (v == null || v.trim().isEmpty) {
                                  return 'Required';
                                }
                                if (int.tryParse(v.trim()) == null) {
                                  return 'Invalid number';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSizes.sm),
                      BlocBuilder<ProductBloc, ProductState>(
                        buildWhen: (p, c) => p.categories != c.categories,
                        builder: (context, state) {
                          final categories = state.categories;
                          if (!categories.contains(_selectedCategory)) {
                            _selectedCategory = null;
                          }
                          return FormField<String>(
                            initialValue: _selectedCategory,
                            validator: (_) =>
                                _selectedCategory == null ? 'Required' : null,
                            builder: (field) => Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                GestureDetector(
                                  onTap: () =>
                                      _showCategorySheet(context, categories),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 14),
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: field.hasError
                                            ? AppColors.danger
                                            : context.borderColor,
                                      ),
                                      borderRadius: BorderRadius.circular(
                                          AppSizes.radiusMd),
                                    ),
                                    child: Row(
                                      children: [
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
                                            _selectedCategory ??
                                                'Select a category',
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: _selectedCategory != null
                                                  ? context.onSurfaceColor
                                                  : context.onSurfaceMuted,
                                            ),
                                          ),
                                        ),
                                        Icon(
                                          Icons.keyboard_arrow_down_rounded,
                                          color: context.onSurfaceMuted,
                                          size: 22,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                if (field.hasError)
                                  Padding(
                                    padding: const EdgeInsets.only(
                                        top: 6, left: 12),
                                    child: Text(
                                      field.errorText!,
                                      style: const TextStyle(
                                          color: AppColors.danger,
                                          fontSize: 12),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSizes.md),

                // ── Product Images card ──────────────────────────────────────
                _SectionLabel('Product Images'),
                const SizedBox(height: AppSizes.xs),
                _FormCard(
                  child: _MultiImagePicker(
                    existingUrls: _existingImageUrls,
                    files: _pickedFiles,
                    onAdd: _showImageSourceSheet,
                    onRemoveExisting: (i) =>
                        setState(() => _existingImageUrls.removeAt(i)),
                    onRemove: _removeImage,
                  ),
                ),

                const SizedBox(height: AppSizes.lg),

                // ── Submit ───────────────────────────────────────────────────
                BlocBuilder<SellerBloc, SellerState>(
                  buildWhen: (p, c) => p.status != c.status,
                  builder: (context, state) => AppButton(
                    label: _isEditing ? 'Save Changes' : 'List Product',
                    loading: state.status == SellerStatus.saving,
                    onPressed: _submit,
                  ),
                ),
                const SizedBox(height: AppSizes.md),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Section label ─────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 3,
          height: 16,
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          text,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: context.onSurfaceColor,
            letterSpacing: 0.1,
          ),
        ),
      ],
    );
  }
}

// ── Form card container ───────────────────────────────────────────────────────

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
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }
}

// ── Multi-image picker ────────────────────────────────────────────────────────

class _MultiImagePicker extends StatelessWidget {
  final List<String> existingUrls;
  final List<XFile> files;
  final VoidCallback onAdd;
  final void Function(int index) onRemoveExisting;
  final void Function(int index) onRemove;

  const _MultiImagePicker({
    required this.existingUrls,
    required this.files,
    required this.onAdd,
    required this.onRemoveExisting,
    required this.onRemove,
  });

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
            return _NetworkImageTile(
              url: existingUrls[i],
              onRemove: () => onRemoveExisting(i),
            );
          }
          final newIdx = i - existingUrls.length;
          if (newIdx < files.length) {
            return _ImageTile(
              file: files[newIdx],
              onRemove: () => onRemove(newIdx),
            );
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
        width: 96,
        height: 96,
        decoration: BoxDecoration(
          color: AppColors.primary.withAlpha(12),
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(
            color: AppColors.primary.withAlpha(70),
            width: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.add_photo_alternate_outlined,
              size: 28,
              color: AppColors.primary.withAlpha(200),
            ),
            const SizedBox(height: 5),
            Text(
              'Add Photo',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.primary.withAlpha(180),
              ),
            ),
          ],
        ),
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
    return Stack(
      children: [
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
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(3),
              child: const Icon(Icons.close, color: Colors.white, size: 14),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Local file image tile ─────────────────────────────────────────────────────

class _ImageTile extends StatelessWidget {
  final XFile file;
  final VoidCallback onRemove;
  const _ImageTile({required this.file, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          child: Image.file(
            File(file.path),
            width: 96,
            height: 96,
            fit: BoxFit.cover,
          ),
        ),
        Positioned(
          top: 5,
          right: 5,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(3),
              child: const Icon(Icons.close, color: Colors.white, size: 14),
            ),
          ),
        ),
      ],
    );
  }
}
