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
import '../../../../shared/widgets/loading_widget.dart';
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

  @override
  void initState() {
    super.initState();
    _load();
    context.read<ProductBloc>().add(CategoriesLoadRequested());
  }

  void _load({bool refresh = false}) {
    context.read<ProductBloc>().add(ProductsLoadRequested(
          search: _searchCtrl.text.trim().isEmpty
              ? null
              : _searchCtrl.text.trim(),
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
      appBar: AppBar(
        title: const Text(AppStrings.products),
        actions: [
          BlocBuilder<CartBloc, CartState>(
            builder: (context, state) {
              final count = state.items.fold<int>(0, (s, i) => s + i.quantity);
              return Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_cart_outlined),
                    onPressed: () => context.push('/cart'),
                  ),
                  if (count > 0)
                    Positioned(
                      right: 6,
                      top: 6,
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
                              fontSize: 10,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          // Sort menu
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            onSelected: (v) {
              setState(() => _sortBy = v);
              _load();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'newest', child: Text('Newest')),
              PopupMenuItem(value: 'price-asc', child: Text('Price: Low to High')),
              PopupMenuItem(value: 'price-desc', child: Text('Price: High to Low')),
              PopupMenuItem(value: 'rating', child: Text('Top Rated')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSizes.md, AppSizes.sm, AppSizes.md, 0),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: AppStrings.search,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          _load();
                          setState(() {});
                        },
                      )
                    : null,
                isDense: true,
              ),
              onChanged: (v) {
                setState(() {});
                if (v.length >= 2 || v.isEmpty) _load();
              },
            ),
          ),
          // Category chips
          BlocBuilder<ProductBloc, ProductState>(
            buildWhen: (p, c) => p.categories != c.categories,
            builder: (context, state) {
              if (state.categories.isEmpty) return const SizedBox.shrink();
              final all = ['All', ...state.categories];
              return SizedBox(
                height: 44,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSizes.md, vertical: AppSizes.xs),
                  scrollDirection: Axis.horizontal,
                  itemCount: all.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(width: AppSizes.sm),
                  itemBuilder: (_, i) {
                    final cat = all[i];
                    final isSelected = cat == 'All'
                        ? _selectedCategory == null
                        : _selectedCategory == cat;
                    return FilterChip(
                      label: Text(cat),
                      selected: isSelected,
                      onSelected: (_) {
                        setState(() {
                          _selectedCategory = cat == 'All' ? null : cat;
                        });
                        _load();
                      },
                      selectedColor: AppColors.primary,
                      checkmarkColor: Colors.white,
                      labelStyle: TextStyle(
                        color:
                            isSelected ? Colors.white : AppColors.textPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    );
                  },
                ),
              );
            },
          ),
          const SizedBox(height: AppSizes.xs),
          // Product grid
          Expanded(
            child: BlocBuilder<ProductBloc, ProductState>(
              buildWhen: (p, c) =>
                  p.status != c.status || p.products != c.products,
              builder: (context, state) {
                if (state.status == ProductStatus.loading &&
                    state.products.isEmpty) {
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
                    icon: Icons.search_off,
                    actionLabel: 'Clear Filters',
                    onAction: () {
                      _searchCtrl.clear();
                      setState(() => _selectedCategory = null);
                      _load();
                    },
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => _load(refresh: true),
                  child: GridView.builder(
                    padding: const EdgeInsets.all(AppSizes.md),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.60,
                      crossAxisSpacing: AppSizes.sm,
                      mainAxisSpacing: AppSizes.sm,
                    ),
                    itemCount: state.products.length,
                    itemBuilder: (_, i) {
                      final product = state.products[i];
                      return ProductCard(
                        product: product,
                        onTap: () =>
                            context.push('/products/${product.id}'),
                        onAddToCart: product.inStock
                            ? () {
                                context.read<CartBloc>().add(
                                    CartItemAdded(product: product));
                                final messenger =
                                    ScaffoldMessenger.of(context);
                                messenger
                                  ..hideCurrentSnackBar()
                                  ..showSnackBar(
                                    SnackBar(
                                      content: Text(
                                          '${product.name} added to cart'),
                                      duration:
                                          const Duration(seconds: 2),
                                      action: SnackBarAction(
                                        label: 'Hide',
                                        onPressed:
                                            messenger.hideCurrentSnackBar,
                                      ),
                                    ),
                                  );
                              }
                            : null,
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
