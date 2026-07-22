import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
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
    // Seed existing images: prefer the full list, fall back to primary image.
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
    final file = await _picker.pickImage(
        source: ImageSource.camera, imageQuality: 85);
    if (file != null) {
      setState(() => _pickedFiles.add(file));
    }
  }

  void _showImageSourceSheet() {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(ctx);
                _pickFromGallery();
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Take a Photo'),
              onTap: () {
                Navigator.pop(ctx);
                _pickFromCamera();
              },
            ),
          ],
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
          padding: const EdgeInsets.all(AppSizes.lg),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionLabel('Product Details'),
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
                        keyboardType: const TextInputType.numberWithOptions(
                            decimal: true),
                        prefixIcon: Icons.attach_money,
                        validator: (v) {
                          if (v == null || v.trim().isEmpty) return 'Required';
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
                          if (v == null || v.trim().isEmpty) return 'Required';
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
                    final validValue = categories.contains(_selectedCategory)
                        ? _selectedCategory
                        : null;
                    return DropdownButtonFormField<String>(
                      key: ValueKey(categories.join(',')),
                      initialValue: validValue,
                      decoration: const InputDecoration(
                        labelText: 'Category',
                        prefixIcon: Icon(Icons.category_outlined),
                      ),
                      hint: const Text('Select a category'),
                      items: categories
                          .map((cat) => DropdownMenuItem(
                                value: cat,
                                child: Text(cat),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _selectedCategory = v),
                      validator: (_) =>
                          _selectedCategory == null ? 'Required' : null,
                    );
                  },
                ),
                const SizedBox(height: AppSizes.md),
                const _SectionLabel('Product Images'),
                _MultiImagePicker(
                  existingUrls: _existingImageUrls,
                  files: _pickedFiles,
                  onAdd: _showImageSourceSheet,
                  onRemoveExisting: (i) =>
                      setState(() => _existingImageUrls.removeAt(i)),
                  onRemove: _removeImage,
                ),
                const SizedBox(height: AppSizes.xl),
                BlocBuilder<SellerBloc, SellerState>(
                  buildWhen: (p, c) => p.status != c.status,
                  builder: (context, state) => AppButton(
                    label: _isEditing ? 'Save Changes' : 'List Product',
                    loading: state.status == SellerStatus.saving,
                    onPressed: _submit,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

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
      height: 100,
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

class _AddTile extends StatelessWidget {
  final VoidCallback onTap;
  const _AddTile({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final mutedColor = scheme.onSurface.withAlpha(100);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 100,
        height: 100,
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(
              color: scheme.outline.withAlpha(100),
              width: 1.5,
              strokeAlign: BorderSide.strokeAlignInside),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_photo_alternate_outlined,
                size: 28, color: mutedColor),
            const SizedBox(height: 4),
            Text(
              'Add Photo',
              style: TextStyle(fontSize: 11, color: mutedColor),
            ),
          ],
        ),
      ),
    );
  }
}

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
            width: 100,
            height: 100,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              width: 100,
              height: 100,
              color: AppColors.surfaceVariant,
              child: const Icon(Icons.broken_image_outlined,
                  color: AppColors.textMuted),
            ),
          ),
        ),
        Positioned(
          top: 4,
          right: 4,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              padding: const EdgeInsets.all(3),
              child:
                  const Icon(Icons.close, color: Colors.white, size: 14),
            ),
          ),
        ),
      ],
    );
  }
}

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
            width: 100,
            height: 100,
            fit: BoxFit.cover,
          ),
        ),
        Positioned(
          top: 4,
          right: 4,
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

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSizes.sm),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).colorScheme.onSurface.withAlpha(153),
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
