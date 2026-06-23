import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/product_entity.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../wishlist/presentation/bloc/wishlist_bloc.dart';
import '../../../wishlist/presentation/bloc/wishlist_event.dart';
import '../../../wishlist/presentation/bloc/wishlist_state.dart';

class ProductCard extends StatelessWidget {
  final ProductEntity product;
  final VoidCallback onTap;
  final VoidCallback? onAddToCart;

  const ProductCard({
    super.key,
    required this.product,
    required this.onTap,
    this.onAddToCart,
  });

  double get _originalPrice => product.price * 1.4;

  @override
  Widget build(BuildContext context) {
    final cardBg = context.cardColor;
    final onSurface = context.onSurfaceColor;
    final muted = context.onSurfaceMuted;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(AppSizes.radiusLg),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image + wishlist
            Expanded(
              flex: 3,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Image.network(
                      product.image,
                      fit: BoxFit.cover,
                      loadingBuilder: (_, child, progress) => progress == null
                          ? child
                          : Container(color: AppColors.shimmerBase),
                      errorBuilder: (_, __, ___) => Container(
                        color: AppColors.shimmerBase,
                        child: const Center(
                          child: Icon(Icons.image_outlined,
                              color: AppColors.textMuted, size: 36),
                        ),
                      ),
                    ),
                  ),
                  if (!product.inStock)
                    Positioned.fill(
                      child: Container(
                        color: Colors.black45,
                        alignment: Alignment.center,
                        child: const Text(
                          'Out of Stock',
                          style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 12),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: BlocBuilder<WishlistBloc, WishlistState>(
                      builder: (context, wishlist) {
                        final wishlisted = wishlist.contains(product.id);
                        return GestureDetector(
                          onTap: () => context
                              .read<WishlistBloc>()
                              .add(WishlistToggled(product)),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                    color: Colors.black.withAlpha(15),
                                    blurRadius: 6)
                              ],
                            ),
                            child: Icon(
                              wishlisted
                                  ? Icons.favorite_rounded
                                  : Icons.favorite_border_rounded,
                              color: wishlisted
                                  ? AppColors.danger
                                  : AppColors.textMuted,
                              size: 16,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  if (product.lowStock)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.warning,
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusFull),
                        ),
                        child: Text(
                          '${product.stock} left',
                          style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              color: Colors.white),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // Info
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: onSurface,
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            size: 13, color: AppColors.warning),
                        const SizedBox(width: 2),
                        Text(
                          product.rating.toStringAsFixed(1),
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: onSurface),
                        ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '\$${product.price.toStringAsFixed(0)}',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: onSurface,
                              ),
                            ),
                            Text(
                              '\$${_originalPrice.toStringAsFixed(0)}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                                color: muted,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ),
                        if (onAddToCart != null && product.inStock)
                          GestureDetector(
                            onTap: onAddToCart,
                            child: Container(
                              width: 30,
                              height: 30,
                              decoration: BoxDecoration(
                                color: AppColors.darkButton,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withAlpha(25),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  )
                                ],
                              ),
                              child: const Icon(
                                  Icons.add_shopping_cart_rounded,
                                  color: Colors.white,
                                  size: 14),
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
      ),
    );
  }
}
