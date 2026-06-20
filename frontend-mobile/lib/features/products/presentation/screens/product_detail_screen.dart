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
import '../../../../shared/widgets/seller_avatar.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productId;
  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;
  int _currentImagePage = 0;
  bool _previewMode = false;
  late final PageController _imageController;

  @override
  void initState() {
    super.initState();
    _imageController = PageController();
    context.read<ProductBloc>().add(ProductDetailRequested(widget.productId));
  }

  @override
  void dispose() {
    _imageController.dispose();
    super.dispose();
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

          final authUser = context.read<AuthBloc>().state.user;
          final isOwnProduct = authUser != null &&
              authUser.isSeller &&
              product.sellerId != null &&
              product.sellerId == authUser.id;

          final originalPrice = product.price * 1.4;
          final images = product.images.isNotEmpty
              ? product.images
              : [product.image];

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
                title: Text(
                  isOwnProduct && _previewMode
                      ? 'Preview as Buyer'
                      : 'Product Details',
                ),
                actions: [
                  if (isOwnProduct)
                    Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: GestureDetector(
                        onTap: () =>
                            setState(() => _previewMode = !_previewMode),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _previewMode
                                ? AppColors.primary
                                : Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                  color: Colors.black.withAlpha(15),
                                  blurRadius: 8)
                            ],
                          ),
                          padding: const EdgeInsets.all(8),
                          child: Icon(
                            _previewMode
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: _previewMode
                                ? Colors.white
                                : AppColors.textPrimary,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
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
                    fit: StackFit.expand,
                    children: [
                      _ImageCarousel(
                        images: images,
                        controller: _imageController,
                        onPageChanged: (i) =>
                            setState(() => _currentImagePage = i),
                      ),
                      if (images.length > 1)
                        Positioned(
                          bottom: 16,
                          left: 0,
                          right: 0,
                          child: _DotIndicators(
                            count: images.length,
                            current: _currentImagePage,
                          ),
                        ),
                      Positioned(
                        bottom: images.length > 1 ? 48 : 16,
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
                      BlocBuilder<AuthBloc, AuthState>(
                        buildWhen: (p, c) =>
                            p.user?.id != c.user?.id ||
                            p.user?.role != c.user?.role,
                        builder: (context, authState) {
                          final isOwn = authState.user != null &&
                              authState.user!.isSeller &&
                              product.sellerId != null &&
                              product.sellerId == authState.user!.id;

                          if (isOwn && !_previewMode) return const SizedBox.shrink();

                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.star_rounded,
                                      size: 16, color: AppColors.warning),
                                  const SizedBox(width: 4),
                                  Text(
                                    product.rating.toStringAsFixed(1),
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 14),
                                  ),
                                  Text(
                                    '  (${product.reviews} reviews)',
                                    style: const TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 13),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSizes.md),
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
                                      borderRadius: BorderRadius.circular(
                                          AppSizes.radiusFull),
                                      border:
                                          Border.all(color: AppColors.border),
                                    ),
                                    child: Row(
                                      children: [
                                        _QtyBtn(
                                          icon: Icons.remove,
                                          onPressed: _quantity > 1
                                              ? () =>
                                                  setState(() => _quantity--)
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
                                              ? () =>
                                                  setState(() => _quantity++)
                                              : null,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          );
                        },
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
                      Text(
                        product.description.length > 200
                            ? '${product.description.substring(0, 200)}…'
                            : product.description,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                          height: 1.6,
                        ),
                      ),
                      if (product.sellerId != null) ...[
                        const SizedBox(height: AppSizes.md),
                        _SellerBtn(
                          sellerId: product.sellerId!,
                          sellerName: product.sellerName,
                          sellerAvatar: product.sellerAvatar,
                        ),
                      ],
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

              if (isOwnProduct && !_previewMode) {
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
                        onPressed: product.inStock && !isOwnProduct
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
                        onPressed: product.inStock && !isOwnProduct
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

class _SellerBtn extends StatelessWidget {
  final String sellerId;
  final String? sellerName;
  final String? sellerAvatar;

  const _SellerBtn({
    required this.sellerId,
    this.sellerName,
    this.sellerAvatar,
  });

  @override
  Widget build(BuildContext context) {
    final name = sellerName?.isNotEmpty == true ? sellerName! : 'Seller';
    return GestureDetector(
      onTap: () => context.push('/seller-profile/$sellerId'),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.md,
          vertical: 12,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppSizes.radiusMd),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            SellerAvatar(
              avatarUrl: sellerAvatar,
              name: name,
              size: 40,
            ),
            const SizedBox(width: AppSizes.sm),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const Text(
                    'Visit Store',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _ImageCarousel extends StatelessWidget {
  final List<String> images;
  final PageController controller;
  final void Function(int) onPageChanged;

  const _ImageCarousel({
    required this.images,
    required this.controller,
    required this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    return PageView.builder(
      controller: controller,
      onPageChanged: onPageChanged,
      itemCount: images.length,
      itemBuilder: (_, i) => Image.network(
        images[i],
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
    );
  }
}

class _DotIndicators extends StatelessWidget {
  final int count;
  final int current;

  const _DotIndicators({required this.count, required this.current});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(
        count,
        (i) => AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: i == current ? 20 : 6,
          height: 6,
          decoration: BoxDecoration(
            color: i == current
                ? Colors.white
                : Colors.white.withAlpha(120),
            borderRadius: BorderRadius.circular(3),
          ),
        ),
      ),
    );
  }
}
