import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/product_bloc.dart';
import '../bloc/product_event.dart';
import '../bloc/product_state.dart';
import '../widgets/product_card.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/seller_avatar.dart';

class SellerProfileScreen extends StatefulWidget {
  final String sellerId;
  const SellerProfileScreen({super.key, required this.sellerId});

  @override
  State<SellerProfileScreen> createState() => _SellerProfileScreenState();
}

class _SellerProfileScreenState extends State<SellerProfileScreen> {
  @override
  void initState() {
    super.initState();
    context.read<ProductBloc>().add(SellerProfileRequested(widget.sellerId));
  }

  Future<void> _refresh() async {
    context.read<ProductBloc>().add(SellerProfileRequested(widget.sellerId));
    await context.read<ProductBloc>().stream.firstWhere(
          (s) => s.sellerProfileStatus != ProductStatus.loading,
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Seller Store'),
      ),
      body: BlocBuilder<ProductBloc, ProductState>(
        buildWhen: (p, c) =>
            p.sellerProfileStatus != c.sellerProfileStatus ||
            p.sellerProfile != c.sellerProfile,
        builder: (context, state) {
          if (state.sellerProfileStatus == ProductStatus.loading) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (state.sellerProfileStatus == ProductStatus.failure) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSizes.lg),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline,
                        size: 48, color: AppColors.textMuted),
                    const SizedBox(height: AppSizes.md),
                    Text(
                      state.sellerProfileError ?? 'Failed to load seller',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: AppSizes.md),
                    ElevatedButton(
                      onPressed: _refresh,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final profile = state.sellerProfile;
          if (profile == null) return const SizedBox.shrink();

          final seller = profile.seller;
          final products = profile.products;
          final joinYear = _parseYear(seller.createdAt);

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: _refresh,
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: _SellerHeader(
                    name: seller.fullName,
                    avatar: seller.avatar,
                    joinYear: joinYear,
                    productCount: products.length,
                  ),
                ),
                if (products.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.shopping_bag_outlined,
                              size: 48, color: AppColors.textMuted),
                          SizedBox(height: AppSizes.sm),
                          Text(
                            'No products yet',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  )
                else ...[
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                        AppSizes.md, AppSizes.sm, AppSizes.md, 0),
                    sliver: SliverToBoxAdapter(
                      child: Text(
                        'Products (${products.length})',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: context.onSurfaceColor,
                        ),
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.all(AppSizes.md),
                    sliver: SliverGrid(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final product = products[index];
                          return ProductCard(
                            key: ValueKey(product.id),
                            product: product,
                            onTap: () =>
                                context.push('/products/${product.id}'),
                          );
                        },
                        childCount: products.length,
                      ),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: AppSizes.sm,
                        mainAxisSpacing: AppSizes.sm,
                        childAspectRatio: 0.72,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  String _parseYear(String createdAt) {
    if (createdAt.isEmpty) return '';
    try {
      return DateTime.parse(createdAt).year.toString();
    } catch (_) {
      return '';
    }
  }
}

class _SellerHeader extends StatelessWidget {
  final String name;
  final String? avatar;
  final String joinYear;
  final int productCount;

  const _SellerHeader({
    required this.name,
    this.avatar,
    required this.joinYear,
    required this.productCount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: context.surfaceColor,
      padding: const EdgeInsets.all(AppSizes.lg),
      child: Column(
        children: [
          SellerAvatar(
            avatarUrl: avatar,
            name: name,
            size: 72,
          ),
          const SizedBox(height: AppSizes.sm),
          Text(
            name,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: context.onSurfaceColor,
            ),
          ),
          if (joinYear.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Member since $joinYear',
              style: TextStyle(fontSize: 13, color: context.onSurfaceSecondary),
            ),
          ],
          const SizedBox(height: AppSizes.md),
          Container(
            padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.lg, vertical: AppSizes.sm),
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(20),
              borderRadius: BorderRadius.circular(AppSizes.radiusFull),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.shopping_bag_outlined,
                    size: 16, color: AppColors.primary),
                const SizedBox(width: 6),
                Text(
                  '$productCount ${productCount == 1 ? 'product' : 'products'}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSizes.sm),
          const Divider(),
        ],
      ),
    );
  }
}
