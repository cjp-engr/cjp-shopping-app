import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/product_bloc.dart';
import '../bloc/product_event.dart';
import '../bloc/product_state.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../shared/widgets/app_button.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
import '../../../cart/presentation/bloc/cart_event.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;
  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    context.read<ProductBloc>().add(ProductDetailRequested(widget.productId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocBuilder<ProductBloc, ProductState>(
        buildWhen: (p, c) =>
            p.selectedProduct != c.selectedProduct || p.status != c.status,
        builder: (context, state) {
          if (state.status == ProductStatus.loading &&
              state.selectedProduct == null) {
            return const LoadingWidget();
          }

          if (state.status == ProductStatus.failure) {
            return Scaffold(
              appBar: AppBar(),
              body: ErrorWidget2(
                message: state.errorMessage ?? AppStrings.genericError,
                onRetry: () => context.read<ProductBloc>().add(
                    ProductDetailRequested(widget.productId)),
              ),
            );
          }

          final product = state.selectedProduct;
          if (product == null) return const LoadingWidget();

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 320,
                pinned: true,
                leading: IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(AppSizes.xs),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black12, blurRadius: 8)
                      ],
                    ),
                    child: const Icon(Icons.arrow_back,
                        color: AppColors.textPrimary, size: 20),
                  ),
                  onPressed: () => context.pop(),
                ),
                flexibleSpace: FlexibleSpaceBar(
                  background: Image.network(
                    product.image,
                    fit: BoxFit.cover,
                    loadingBuilder: (_, child, progress) => progress == null
                        ? child
                        : Container(color: AppColors.shimmerBase),
                    errorBuilder: (_, __, ___) => Container(
                      color: AppColors.shimmerBase,
                      child: const Icon(Icons.broken_image_outlined,
                          size: 64, color: AppColors.textMuted),
                    ),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(AppSizes.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category + badge
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withAlpha(20),
                              borderRadius: BorderRadius.circular(
                                  AppSizes.radiusFull),
                            ),
                            child: Text(
                              product.category,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const Spacer(),
                          if (!product.inStock)
                            const Chip(
                              label: Text('Out of Stock'),
                              backgroundColor: AppColors.danger,
                              labelStyle: TextStyle(color: Colors.white),
                            )
                          else if (product.lowStock)
                            Chip(
                              label: Text('Only ${product.stock} left'),
                              backgroundColor: AppColors.warning,
                              labelStyle:
                                  const TextStyle(color: Colors.white),
                            ),
                        ],
                      ),
                      const SizedBox(height: AppSizes.sm),
                      Text(
                        product.name,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: AppSizes.sm),
                      Row(
                        children: [
                          const Icon(Icons.star,
                              size: 18, color: AppColors.warning),
                          const SizedBox(width: 4),
                          Text(
                            '${product.rating.toStringAsFixed(1)}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          Text(
                            ' (${product.reviews} reviews)',
                            style: const TextStyle(
                                color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSizes.md),
                      Text(
                        '\$${product.price.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: AppColors.primary,
                        ),
                      ),
                      const Divider(height: AppSizes.xl),
                      const Text(
                        'Description',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: AppSizes.sm),
                      Text(
                        product.description,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                          height: 1.6,
                        ),
                      ),
                      if (product.specifications.isNotEmpty) ...[
                        const Divider(height: AppSizes.xl),
                        const Text(
                          'Specifications',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: AppSizes.sm),
                        ...product.specifications.entries.map(
                          (e) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              children: [
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    e.key,
                                    style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 13),
                                  ),
                                ),
                                Expanded(
                                  flex: 3,
                                  child: Text(
                                    e.value,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 100), // bottom padding for FAB
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      bottomSheet: BlocBuilder<ProductBloc, ProductState>(
        buildWhen: (p, c) => p.selectedProduct != c.selectedProduct,
        builder: (context, state) {
          final product = state.selectedProduct;
          if (product == null) return const SizedBox.shrink();
          return Container(
            padding: const EdgeInsets.all(AppSizes.md),
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: Border(
                  top: BorderSide(color: AppColors.border)),
              boxShadow: [
                BoxShadow(
                    color: Colors.black12,
                    blurRadius: 12,
                    offset: const Offset(0, -4))
              ],
            ),
            child: Row(
              children: [
                // Quantity stepper
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(AppSizes.radiusMd),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove, size: 18),
                        onPressed: _quantity > 1
                            ? () => setState(() => _quantity--)
                            : null,
                      ),
                      Text(
                        '$_quantity',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add, size: 18),
                        onPressed: _quantity < product.stock
                            ? () => setState(() => _quantity++)
                            : null,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSizes.md),
                Expanded(
                  child: AppButton(
                    label: product.inStock
                        ? AppStrings.addToCart
                        : AppStrings.outOfStock,
                    icon: Icons.shopping_cart_outlined,
                    onPressed: product.inStock
                        ? () {
                            context.read<CartBloc>().add(CartItemAdded(
                                product: product, quantity: _quantity));
                            final messenger =
                                ScaffoldMessenger.of(context);
                            messenger
                              ..hideCurrentSnackBar()
                              ..showSnackBar(
                                SnackBar(
                                  content: Text('Added $_quantity × ${product.name} to cart'),
                                  duration: const Duration(seconds: 2),
                                  action: SnackBarAction(
                                    label: 'Hide',
                                    onPressed: messenger.hideCurrentSnackBar,
                                  ),
                                ),
                              );
                          }
                        : null,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
