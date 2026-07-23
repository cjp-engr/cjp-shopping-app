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
import '../../../../keys.dart';
import '../../../../shared/widgets/seller_avatar.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../../auth/presentation/bloc/auth_state.dart';
import '../../../cart/presentation/bloc/cart_bloc.dart';
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
  bool _showMyProducts = false;
  String _myProductsCategory = 'All';

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
      key: keys.products.homeScreen,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            _buildSearchBar(context),
            const SizedBox(height: AppSizes.sm),
            BlocBuilder<AuthBloc, AuthState>(
              buildWhen: (p, c) => p.user?.role != c.user?.role,
              builder: (context, authState) {
                if (authState.user?.isSeller != true)
                  return const SizedBox.shrink();
                return _buildViewTabs(context);
              },
            ),
            if (!_showMyProducts) ...[
              _buildCategoryChips(context),
              const SizedBox(height: AppSizes.sm),
            ],
            Expanded(
                child: _showMyProducts
                    ? _buildMyProductsBody(context)
                    : _buildBody(context)),
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
              Semantics(
                label: 'Notifications',
                button: true,
                child: IconButton(
                  onPressed: () {},
                  icon: Icon(Icons.notifications_outlined,
                      color: onSurface, size: 24),
                  padding: const EdgeInsets.all(8),
                  constraints:
                      const BoxConstraints(minWidth: 44, minHeight: 44),
                ),
              ),
              BlocBuilder<CartBloc, CartState>(
                builder: (context, state) {
                  final count = state.totalQuantity;
                  return Stack(
                    children: [
                      Semantics(
                        label: 'Open cart',
                        button: true,
                        child: IconButton(
                          icon: Icon(Icons.shopping_bag_outlined,
                              color: onSurface, size: 24),
                          onPressed: () => context.push('/cart'),
                          padding: const EdgeInsets.all(8),
                          constraints:
                              const BoxConstraints(minWidth: 44, minHeight: 44),
                        ),
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
                key: keys.products.searchField,
                controller: _searchCtrl,
                style: TextStyle(color: onSurface),
                keyboardType: TextInputType.text,
                textInputAction: TextInputAction.search,
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
                  contentPadding: const EdgeInsets.symmetric(vertical: 8),
                ),
                onTapOutside: (_) =>
                    FocusManager.instance.primaryFocus?.unfocus(),
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
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppSizes.sm)),
              Builder(builder: (context) {
                final currentUserId = context.read<AuthBloc>().state.user?.id;
                final visibleProducts = state.products
                    .where((p) =>
                        currentUserId == null || p.sellerId != currentUserId)
                    .toList();
                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSizes.md),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.62,
                      crossAxisSpacing: AppSizes.sm,
                      mainAxisSpacing: AppSizes.sm,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => ProductCard(
                        product: visibleProducts[i],
                        onTap: () =>
                            context.push('/products/${visibleProducts[i].id}'),
                      ),
                      childCount: visibleProducts.length,
                    ),
                  ),
                );
              }),
              const SliverToBoxAdapter(child: SizedBox(height: AppSizes.xl)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildViewTabs(BuildContext context) {
    final surfaceVariant = context.surfaceVariantColor;
    return Padding(
      padding:
          const EdgeInsets.fromLTRB(AppSizes.md, 0, AppSizes.md, AppSizes.sm),
      child: Container(
        height: 40,
        decoration: BoxDecoration(
          color: surfaceVariant,
          borderRadius: BorderRadius.circular(AppSizes.radiusFull),
        ),
        child: Stack(
          children: [
            // Single sliding pill — no per-tab animation, no splash artifact
            AnimatedAlign(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeInOut,
              alignment: _showMyProducts
                  ? Alignment.centerRight
                  : Alignment.centerLeft,
              child: FractionallySizedBox(
                widthFactor: 0.5,
                child: Container(
                  margin: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppSizes.radiusFull),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(20),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            // Labels sit on top of the pill
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _showMyProducts = false),
                    behavior: HitTestBehavior.opaque,
                    child: Center(
                      child: Text(
                        'All Products',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: !_showMyProducts
                              ? AppColors.primary
                              : context.onSurfaceSecondary,
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() {
                      _showMyProducts = true;
                      _myProductsCategory = 'All';
                    }),
                    behavior: HitTestBehavior.opaque,
                    child: Center(
                      child: Text(
                        'My Products',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: _showMyProducts
                              ? AppColors.primary
                              : context.onSurfaceSecondary,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMyProductsBody(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        final currentUserId = authState.user?.id;
        return BlocBuilder<ProductBloc, ProductState>(
          builder: (context, state) {
            if (state.status == ProductStatus.loading) {
              return const LoadingWidget();
            }
            final myProducts = state.products
                .where((p) => p.sellerId == currentUserId)
                .toList();
            if (myProducts.isEmpty) {
              return const EmptyWidget(
                icon: Icons.storefront_outlined,
                message:
                    'You have no products listed yet.\nGo to your seller dashboard to add products.',
              );
            }

            final categories = [
              'All',
              ...{for (final p in myProducts) p.category},
            ];
            final filtered = _myProductsCategory == 'All'
                ? myProducts
                : myProducts
                    .where((p) => p.category == _myProductsCategory)
                    .toList();

            return Column(
              children: [
                // Category chips — same style as All Products chips
                SizedBox(
                  height: 38,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSizes.md),
                    itemCount: categories.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final cat = categories[i];
                      final isActive = cat == _myProductsCategory;
                      return GestureDetector(
                        onTap: () => setState(() => _myProductsCategory = cat),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 8),
                          decoration: BoxDecoration(
                            color: isActive
                                ? AppColors.primary
                                : context.surfaceVariantColor,
                            borderRadius:
                                BorderRadius.circular(AppSizes.radiusFull),
                          ),
                          child: Text(
                            cat,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: isActive
                                  ? Colors.white
                                  : context.onSurfaceSecondary,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: AppSizes.sm),
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(
                          child: Text(
                            'No products in this category.',
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                        )
                      : RefreshIndicator(
                          color: AppColors.primary,
                          onRefresh: () async => _load(refresh: true),
                          child: GridView.builder(
                            padding: const EdgeInsets.all(AppSizes.md),
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.62,
                              crossAxisSpacing: AppSizes.sm,
                              mainAxisSpacing: AppSizes.sm,
                            ),
                            itemCount: filtered.length,
                            itemBuilder: (_, i) => ProductCard(
                              product: filtered[i],
                              onTap: () =>
                                  context.push('/products/${filtered[i].id}'),
                            ),
                          ),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

class _PromoBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 168,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.bannerStart, AppColors.bannerEnd],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
            color: AppColors.bannerEnd.withAlpha(80),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Decorative circles
          Positioned(
            right: -24,
            top: -36,
            child: Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withAlpha(20),
              ),
            ),
          ),
          Positioned(
            right: 40,
            bottom: -50,
            child: Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withAlpha(13),
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(AppSizes.md),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(40),
                          borderRadius:
                              BorderRadius.circular(AppSizes.radiusFull),
                        ),
                        child: const Text(
                          'Opulent Savings',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.2),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Exclusive 50%\nLuxury Sale',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          height: 1.15,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 13),
                      GestureDetector(
                        onTap: () {},
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 9),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius:
                                BorderRadius.circular(AppSizes.radiusFull),
                          ),
                          child: const Text(
                            'Shop Now',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSizes.radiusMd),
                // Visible icon in a soft circle
                Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withAlpha(30),
                  ),
                  child: const Icon(
                    Icons.shopping_bag_rounded,
                    color: Colors.white,
                    size: 48,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
