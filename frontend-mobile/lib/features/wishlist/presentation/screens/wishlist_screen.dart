import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:toko_mart/core/constants/app_strings.dart';
import 'package:toko_mart/shared/widgets/app_button.dart';
import '../bloc/wishlist_bloc.dart';
import '../bloc/wishlist_event.dart';
import '../bloc/wishlist_state.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';

class WishlistScreen extends StatelessWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Favourites'),
        actions: [
          BlocBuilder<WishlistBloc, WishlistState>(
            builder: (context, state) {
              if (state.items.isEmpty) return const SizedBox.shrink();
              return TextButton(
                onPressed: () =>
                    context.read<WishlistBloc>().add(const WishlistCleared()),
                child: const Text('Clear all',
                    style: TextStyle(
                        color: AppColors.danger, fontWeight: FontWeight.w600)),
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<WishlistBloc, WishlistState>(
        builder: (context, state) {
          final onSurface = context.onSurfaceColor;
          final onSurfaceSec = context.onSurfaceSecondary;
          final muted = context.onSurfaceMuted;
          final cardBg = context.cardColor;

          if (state.items.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 88,
                    height: 88,
                    decoration: const BoxDecoration(
                      color: AppColors.primaryLight,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.favorite_border_rounded,
                        size: 44, color: AppColors.primary),
                  ),
                  const SizedBox(height: AppSizes.lg),
                  Text(
                    'No favorites yet',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: onSurface,
                    ),
                  ),
                  const SizedBox(height: AppSizes.xs),
                  Text(
                    'Tap the heart on any product\nto save it here',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: onSurfaceSec),
                  ),
                  const SizedBox(height: AppSizes.xl),
                  SizedBox(
                    width: 180,
                    height: AppSizes.buttonHeight,
                    child: AppButton(
                      label: AppStrings.browseProducts,
                      onPressed: () => context.go('/'),
                    ),
                  ),
                ],
              ),
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    AppSizes.md, AppSizes.sm, AppSizes.md, 0),
                child: Text(
                  '${state.items.length} item${state.items.length == 1 ? '' : 's'}',
                  style: TextStyle(
                    fontSize: 13,
                    color: onSurfaceSec,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(AppSizes.md),
                  itemCount: state.items.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSizes.sm),
                  itemBuilder: (_, i) {
                    final product = state.items[i];
                    final originalPrice = product.price * 1.4;
                    return GestureDetector(
                      onTap: () => context.push('/products/${product.id}'),
                      child: Container(
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusLg),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(6),
                              blurRadius: 10,
                              offset: const Offset(0, 2),
                            )
                          ],
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.horizontal(
                                left: Radius.circular(AppSizes.radiusLg),
                              ),
                              child: Image.network(
                                product.image,
                                width: 110,
                                height: 110,
                                fit: BoxFit.cover,
                                loadingBuilder: (_, child, progress) =>
                                    progress == null
                                        ? child
                                        : Container(
                                            width: 110,
                                            height: 110,
                                            color: AppColors.shimmerBase),
                                errorBuilder: (_, __, ___) => Container(
                                  width: 110,
                                  height: 110,
                                  color: AppColors.shimmerBase,
                                  child: const Icon(Icons.image_outlined,
                                      color: AppColors.textMuted, size: 32),
                                ),
                              ),
                            ),
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.all(AppSizes.md),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppColors.primaryLight,
                                        borderRadius: BorderRadius.circular(
                                            AppSizes.radiusFull),
                                      ),
                                      child: Text(
                                        product.category,
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      product.name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: onSurface,
                                        height: 1.3,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
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
                                              color: onSurfaceSec),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '\$${product.price.toStringAsFixed(0)}',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.w900,
                                                color: onSurface,
                                              ),
                                            ),
                                            Text(
                                              '\$${originalPrice.toStringAsFixed(0)}',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: muted,
                                                decoration:
                                                    TextDecoration.lineThrough,
                                              ),
                                            ),
                                          ],
                                        ),
                                        GestureDetector(
                                          onTap: () => context
                                              .read<WishlistBloc>()
                                              .add(WishlistToggled(product)),
                                          child: Container(
                                            width: 36,
                                            height: 36,
                                            decoration: const BoxDecoration(
                                              color: AppColors.dangerSurface,
                                              shape: BoxShape.circle,
                                            ),
                                            child: const Icon(
                                              Icons.favorite_rounded,
                                              color: AppColors.danger,
                                              size: 18,
                                            ),
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
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
