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
import '../../../follow/presentation/bloc/user_profile_bloc.dart';
import '../../../follow/presentation/bloc/user_profile_event.dart';
import '../../../follow/presentation/bloc/user_profile_state.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../../core/constants/app_strings.dart';

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
        backgroundColor: AppColors.bannerStart,
        foregroundColor: Colors.white,
        title: const Text(AppStrings.sellerStore),
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
                      state.sellerProfileError ?? AppStrings.failedToLoadSeller,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: AppSizes.md),
                    ElevatedButton(
                      onPressed: _refresh,
                      child: const Text(AppStrings.retry),
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
                    sellerId: widget.sellerId,
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
                            AppStrings.noProductsYet,
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  )
                else ...[
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                        AppSizes.md, AppSizes.md, AppSizes.md, 0),
                    sliver: SliverToBoxAdapter(
                      child: Row(
                        children: [
                          Container(
                            width: 3,
                            height: 18,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Products',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: context.onSurfaceColor,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withAlpha(20),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${products.length}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
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

class _StatColumn extends StatelessWidget {
  final String value;
  final String label;
  final IconData icon;

  const _StatColumn({
    required this.value,
    required this.label,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSizes.lg, vertical: AppSizes.sm),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: context.onSurfaceColor,
            ),
          ),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: context.onSurfaceSecondary),
          ),
        ],
      ),
    );
  }
}

class _SellerHeader extends StatelessWidget {
  final String name;
  final String? avatar;
  final String joinYear;
  final int productCount;
  final String sellerId;

  const _SellerHeader({
    required this.name,
    this.avatar,
    required this.joinYear,
    required this.productCount,
    required this.sellerId,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Gradient hero ────────────────────────────────────────────────
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.bannerStart, AppColors.primary],
            ),
          ),
          padding: const EdgeInsets.fromLTRB(
              AppSizes.lg, AppSizes.lg, AppSizes.lg, AppSizes.lg),
          child: Column(
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white.withAlpha(200), width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(50),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: SellerAvatar(avatarUrl: avatar, name: name, size: 80),
              ),
              const SizedBox(height: 12),
              Text(
                name,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.3,
                ),
              ),
              if (joinYear.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.calendar_today_outlined,
                        size: 12, color: Colors.white70),
                    const SizedBox(width: 4),
                    Text(
                      'Member since $joinYear',
                      style: const TextStyle(
                          fontSize: 13, color: Colors.white70),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        // ── Stats + Follow ───────────────────────────────────────────────
        Container(
          color: context.surfaceColor,
          child: BlocBuilder<UserProfileBloc, UserProfileState>(
            builder: (context, followState) {
              final currentUserId = context.read<AuthBloc>().state.user?.id;
              final isSelf = currentUserId == sellerId;
              final followUser = followState.user;
              final isFollowing = followUser?.isFollowing ?? false;
              final followersCount = followUser?.followersCount ?? 0;
              final isLoading =
                  followState.status == UserProfileStatus.loading;

              return Column(
                children: [
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(vertical: AppSizes.md),
                    child: IntrinsicHeight(
                      child: Row(
                        children: [
                          Expanded(
                            child: _StatColumn(
                              value: '$productCount',
                              label: productCount == 1
                                  ? 'Product'
                                  : 'Products',
                              icon: Icons.shopping_bag_outlined,
                            ),
                          ),
                          VerticalDivider(
                            width: 1,
                            thickness: 1,
                            color: context.borderColor,
                          ),
                          Expanded(
                            child: _StatColumn(
                              value: '$followersCount',
                              label: followersCount == 1
                                  ? 'Follower'
                                  : 'Followers',
                              icon: Icons.people_outline_rounded,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (!isSelf) ...[
                    Divider(height: 1, color: context.borderColor),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(AppSizes.lg,
                          AppSizes.md, AppSizes.lg, AppSizes.md),
                      child: SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: isFollowing
                                ? context.surfaceVariantColor
                                : AppColors.primary,
                            foregroundColor: isFollowing
                                ? context.onSurfaceColor
                                : Colors.white,
                            padding:
                                const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                  AppSizes.radiusFull),
                            ),
                          ),
                          onPressed: isLoading
                              ? null
                              : () => context.read<UserProfileBloc>().add(
                                    UserProfileFollowToggled(
                                      targetUserId: sellerId,
                                      currentlyFollowing: isFollowing,
                                    ),
                                  ),
                          icon: isLoading
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Icon(
                                  isFollowing
                                      ? Icons.person_remove_rounded
                                      : Icons.person_add_rounded,
                                  size: 18,
                                ),
                          label: Text(
                            isFollowing ? AppStrings.unfollow : AppStrings.follow,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
        ),
        Divider(height: 1, thickness: 1, color: context.borderColor),
      ],
    );
  }
}
