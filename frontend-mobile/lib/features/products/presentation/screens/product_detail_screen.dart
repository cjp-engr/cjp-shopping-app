import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/product_bloc.dart';
import '../bloc/product_event.dart';
import '../bloc/product_state.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
import '../../../cart/presentation/bloc/cart_event.dart';
import '../../../wishlist/presentation/bloc/wishlist_bloc.dart';
import '../../../wishlist/presentation/bloc/wishlist_event.dart';
import '../../../wishlist/presentation/bloc/wishlist_state.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_state.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;
  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;
  bool _descExpanded = false;

  @override
  void initState() {
    super.initState();
    context.read<ProductBloc>().add(ProductDetailRequested(widget.productId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
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
                onRetry: () => context
                    .read<ProductBloc>()
                    .add(ProductDetailRequested(widget.productId)),
              ),
            );
          }
          final product = state.selectedProduct;
          if (product == null) return const LoadingWidget();

          final originalPrice = product.price * 1.4;

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 340,
                pinned: true,
                backgroundColor: AppColors.surface,
                foregroundColor: AppColors.textPrimary,
                elevation: 0,
                scrolledUnderElevation: 0,
                leading: Padding(
                  padding: const EdgeInsets.all(8),
                  child: GestureDetector(
                    onTap: () => context.pop(),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withAlpha(15), blurRadius: 8)
                        ],
                      ),
                      child: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary, size: 20),
                    ),
                  ),
                ),
                title: const Text('Product Details'),
                actions: [
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: GestureDetector(
                      onTap: () => context.push('/cart'),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withAlpha(15),
                                blurRadius: 8)
                          ],
                        ),
                        padding: const EdgeInsets.all(8),
                        child: const Icon(Icons.shopping_bag_outlined,
                            color: AppColors.textPrimary, size: 20),
                      ),
                    ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    children: [
                      Image.network(
                        product.image,
                        width: double.infinity,
                        height: double.infinity,
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
                      Positioned(
                        bottom: 16,
                        right: 16,
                        child: BlocBuilder<WishlistBloc, WishlistState>(
                          builder: (context, wishlist) {
                            final wishlisted = wishlist.contains(product.id);
                            return GestureDetector(
                              onTap: () => context
                                  .read<WishlistBloc>()
                                  .add(WishlistToggled(product)),
                              child: Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                        color: Colors.black.withAlpha(20),
                                        blurRadius: 8)
                                  ],
                                ),
                                child: Icon(
                                  wishlisted
                                      ? Icons.favorite_rounded
                                      : Icons.favorite_border_rounded,
                                  color: wishlisted
                                      ? AppColors.danger
                                      : AppColors.textMuted,
                                  size: 22,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(AppSizes.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: AppSizes.md),
                      // Name + Price
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              product.name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                                letterSpacing: -0.3,
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSizes.sm),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '\$${product.price.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                '\$${originalPrice.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textMuted,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded,
                              size: 16, color: AppColors.warning),
                          const SizedBox(width: 4),
                          Text(
                            product.rating.toStringAsFixed(1),
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          Text(
                            '  (${product.reviews} reviews)',
                            style: const TextStyle(
                                color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSizes.md),
                      // Quantity
                      Row(
                        children: [
                          const Text(
                            'Quantity',
                            style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary),
                          ),
                          const Spacer(),
                          Container(
                            decoration: BoxDecoration(
                              color: AppColors.surfaceVariant,
                              borderRadius:
                                  BorderRadius.circular(AppSizes.radiusFull),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Row(
                              children: [
                                _QtyBtn(
                                  icon: Icons.remove,
                                  onPressed: _quantity > 1
                                      ? () => setState(() => _quantity--)
                                      : null,
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16),
                                  child: Text(
                                    '$_quantity',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 15),
                                  ),
                                ),
                                _QtyBtn(
                                  icon: Icons.add,
                                  onPressed: _quantity < product.stock
                                      ? () => setState(() => _quantity++)
                                      : null,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSizes.md),
                      // Description
                      const Text(
                        'Description',
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      GestureDetector(
                        onTap: () =>
                            setState(() => _descExpanded = !_descExpanded),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.description,
                              maxLines: _descExpanded ? null : 3,
                              overflow: _descExpanded
                                  ? TextOverflow.visible
                                  : TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 14,
                                height: 1.6,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _descExpanded ? 'Show less' : 'Learn More',
                              style: const TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 100),
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
        builder: (context, productState) {
          final product = productState.selectedProduct;
          if (product == null) return const SizedBox.shrink();

          return BlocBuilder<AuthBloc, AuthState>(
            buildWhen: (p, c) =>
                p.user?.id != c.user?.id || p.user?.role != c.user?.role,
            builder: (context, authState) {
              final user = authState.user;
              final isOwnProduct = user != null &&
                  user.isSeller &&
                  product.sellerId != null &&
                  product.sellerId == user.id;

              final padding = EdgeInsets.fromLTRB(
                AppSizes.md,
                AppSizes.sm,
                AppSizes.md,
                MediaQuery.of(context).padding.bottom + AppSizes.xs,
              );

              if (isOwnProduct) {
                return Container(
                  padding: padding,
                  decoration: const BoxDecoration(
                    color: AppColors.surface,
                    border: Border(top: BorderSide(color: AppColors.border)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push(
                            '/seller/edit/${product.id}',
                            extra: product,
                          ),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, AppSizes.buttonHeight),
                          ),
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          label: const Text('Edit Product'),
                        ),
                      ),
                    ],
                  ),
                );
              }

              return Container(
                padding: padding,
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  border: Border(top: BorderSide(color: AppColors.border)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: product.inStock
                            ? () {
                                context.read<CartBloc>().add(CartItemAdded(
                                    product: product, quantity: _quantity));
                                context.push('/cart');
                              }
                            : null,
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(0, AppSizes.buttonHeight),
                        ),
                        icon: const Icon(Icons.shopping_bag_outlined, size: 18),
                        label: const Text('Buy Now'),
                      ),
                    ),
                    const SizedBox(width: AppSizes.sm),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: product.inStock
                            ? () {
                                context.read<CartBloc>().add(CartItemAdded(
                                    product: product, quantity: _quantity));
                                ScaffoldMessenger.of(context)
                                    .showSnackBar(SnackBar(
                                  content:
                                      Text('Added to cart: ${product.name}'),
                                  duration: const Duration(seconds: 2),
                                  action: SnackBarAction(
                                    label: 'View Cart',
                                    onPressed: () => context.push('/cart'),
                                  ),
                                ));
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(0, AppSizes.buttonHeight),
                        ),
                        child: const Text(AppStrings.addToCart),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  const _QtyBtn({required this.icon, this.onPressed});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        child: Icon(icon,
            size: 18,
            color: onPressed == null
                ? AppColors.textMuted
                : AppColors.textPrimary),
      ),
    );
  }
}
