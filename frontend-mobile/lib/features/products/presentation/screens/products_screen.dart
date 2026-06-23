import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../bloc/product_bloc.dart';
import '../bloc/product_event.dart';
import '../bloc/product_state.dart';
import '../widgets/product_card.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/seller_avatar.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_state.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
import '../../../cart/presentation/bloc/cart_event.dart';
import '../../../cart/presentation/bloc/cart_state.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _searchCtrl = TextEditingController();
  String? _selectedCategory;
  String _sortBy = 'newest';
  bool _searchActive = false;

  @override
  void initState() {
    super.initState();
    _load();
    context.read<ProductBloc>().add(CategoriesLoadRequested());
  }

  void _load({bool refresh = false}) {
    context.read<ProductBloc>().add(ProductsLoadRequested(
          search:
              _searchCtrl.text.trim().isEmpty ? null : _searchCtrl.text.trim(),
          category: _selectedCategory,
          sortBy: _sortBy,
          refresh: refresh,
        ));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            _buildSearchBar(context),
            const SizedBox(height: AppSizes.sm),
            _buildCategoryChips(context),
            const SizedBox(height: AppSizes.sm),
            Expanded(child: _buildBody(context)),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final onSurface = context.onSurfaceColor;
    final onSurfaceSec = context.onSurfaceSecondary;
    return Padding(
      padding: const EdgeInsets.fromLTRB(
          AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.sm),
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          final name = state.status == AuthStatus.authenticated
              ? state.user?.firstName ?? 'there'
              : 'there';
          final avatar = state.status == AuthStatus.authenticated
              ? state.user?.avatar
              : null;
          return Row(
            children: [
              SellerAvatar(avatarUrl: avatar, name: name, size: 42),
              const SizedBox(width: AppSizes.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hello $name',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: onSurface,
                        letterSpacing: -0.2,
                      ),
                    ),
                    Text(
                      'Welcome to TokoMart',
                      style: TextStyle(
                        fontSize: 12,
                        color: onSurfaceSec,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {},
                icon: Icon(Icons.notifications_outlined,
                    color: onSurface, size: 24),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
              ),
              BlocBuilder<CartBloc, CartState>(
                builder: (context, state) {
                  final count = state.totalQuantity;
                  return Stack(
                    children: [
                      IconButton(
                        icon: Icon(Icons.shopping_bag_outlined,
                            color: onSurface, size: 24),
                        onPressed: () => context.push('/cart'),
                        padding: EdgeInsets.zero,
                        constraints:
                            const BoxConstraints(minWidth: 40, minHeight: 40),
                      ),
                      if (count > 0)
                        Positioned(
                          right: 4,
                          top: 4,
                          child: Container(
                            width: 16,
                            height: 16,
                            decoration: const BoxDecoration(
                              color: AppColors.danger,
                              shape: BoxShape.circle,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '$count',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w800),
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    final surfaceVariant = context.surfaceVariantColor;
    final border = context.borderColor;
    final onSurface = context.onSurfaceColor;
    final muted = context.onSurfaceMuted;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSizes.md),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: surfaceVariant,
                borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                border: Border.all(color: border),
              ),
              child: TextField(
                controller: _searchCtrl,
                style: TextStyle(color: onSurface),
                decoration: InputDecoration(
                  hintText: AppStrings.search,
                  hintStyle: TextStyle(color: muted, fontSize: 14),
                  prefixIcon: Icon(Icons.search, color: muted, size: 20),
                  suffixIcon: _searchCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: Icon(Icons.clear, color: muted, size: 18),
                          onPressed: () {
                            _searchCtrl.clear();
                            _load();
                            setState(() => _searchActive = false);
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: Colors.transparent,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onChanged: (v) {
                  setState(() => _searchActive = v.isNotEmpty);
                  if (v.length >= 2 || v.isEmpty) _load();
                },
              ),
            ),
          ),
          const SizedBox(width: AppSizes.sm),
          PopupMenuButton<String>(
            onSelected: (v) {
              setState(() => _sortBy = v);
              _load();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'newest', child: Text('Newest')),
              PopupMenuItem(
                  value: 'price-asc', child: Text('Price: Low to High')),
              PopupMenuItem(
                  value: 'price-desc', child: Text('Price: High to Low')),
              PopupMenuItem(value: 'rating', child: Text('Top Rated')),
            ],
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: surfaceVariant,
                borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                border: Border.all(color: border),
              ),
              child: Icon(Icons.tune_rounded, color: onSurface, size: 22),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChips(BuildContext context) {
    return BlocBuilder<ProductBloc, ProductState>(
      buildWhen: (p, c) => p.categories != c.categories,
      builder: (context, state) {
        final surfaceVariant = context.surfaceVariantColor;
        final onSurfaceSec = context.onSurfaceSecondary;
        final all = ['All', ...state.categories];
        return SizedBox(
          height: 38,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: AppSizes.md),
            scrollDirection: Axis.horizontal,
            itemCount: all.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final cat = all[i];
              final isSelected = cat == 'All'
                  ? _selectedCategory == null
                  : _selectedCategory == cat;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedCategory = cat == 'All' ? null : cat;
                  });
                  _load();
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : surfaceVariant,
                    borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                  ),
                  child: Text(
                    cat,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? Colors.white : onSurfaceSec,
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildBody(BuildContext context) {
    final onSurface = context.onSurfaceColor;
    return BlocBuilder<ProductBloc, ProductState>(
      buildWhen: (p, c) => p.status != c.status || p.products != c.products,
      builder: (context, state) {
        if (state.status == ProductStatus.loading && state.products.isEmpty) {
          return const LoadingWidget();
        }
        if (state.status == ProductStatus.failure) {
          return ErrorWidget2(
            message: state.errorMessage ?? AppStrings.genericError,
            onRetry: _load,
          );
        }

        if (state.products.isEmpty) {
          return EmptyWidget(
            message: AppStrings.noProducts,
            icon: Icons.search_off_rounded,
            actionLabel: 'Clear Filters',
            onAction: () {
              _searchCtrl.clear();
              setState(() => _selectedCategory = null);
              _load();
            },
          );
        }

        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async => _load(refresh: true),
          child: CustomScrollView(
            slivers: [
              if (!_searchActive)
                SliverToBoxAdapter(
                  child: Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSizes.md),
                    child: _PromoBanner(),
                  ),
                ),
              if (!_searchActive)
                const SliverToBoxAdapter(child: SizedBox(height: AppSizes.md)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSizes.md),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _searchActive
                            ? '${state.products.length} results'
                            : 'New Arrivals',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: onSurface,
                        ),
                      ),
                      TextButton(
                        onPressed: () {},
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('See All',
                            style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary)),
                      ),
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppSizes.sm)),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: AppSizes.md),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.62,
                    crossAxisSpacing: AppSizes.sm,
                    mainAxisSpacing: AppSizes.sm,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (_, i) {
                      final product = state.products[i];
                      final currentUserId =
                          context.read<AuthBloc>().state.user?.id;
                      final isOwn = currentUserId != null &&
                          product.sellerId == currentUserId;
                      return ProductCard(
                        product: product,
                        onTap: () => context.push('/products/${product.id}'),
                        onAddToCart: product.inStock && !isOwn
                            ? () {
                                context
                                    .read<CartBloc>()
                                    .add(CartItemAdded(product: product));
                                ScaffoldMessenger.of(context)
                                  ..hideCurrentSnackBar()
                                  ..showSnackBar(SnackBar(
                                    content:
                                        Text('${product.name} added to cart'),
                                    duration: const Duration(seconds: 2),
                                  ));
                              }
                            : null,
                      );
                    },
                    childCount: state.products.length,
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppSizes.xl)),
            ],
          ),
        );
      },
    );
  }
}

class _PromoBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.bannerStart, AppColors.bannerEnd],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
      ),
      padding: const EdgeInsets.all(AppSizes.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(30),
                    borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                  ),
                  child: const Text(
                    'Opulent Savings',
                    style: TextStyle(
                        color: Colors.white70,
                        fontSize: 11,
                        fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Exclusive 50%\nLuxury Sale',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: () {},
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.darkButton,
                      borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                    ),
                    child: const Text(
                      'Shop Now',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.shopping_bag_rounded,
              color: Colors.white24, size: 90),
        ],
      ),
    );
  }
}
