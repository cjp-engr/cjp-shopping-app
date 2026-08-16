import 'package:equatable/equatable.dart';
import '../../domain/entities/product_entity.dart';
import '../../domain/entities/seller_profile_entity.dart';

enum ProductStatus { initial, loading, success, failure }

class ProductState extends Equatable {
  final ProductStatus status;
  final List<ProductEntity> products;
  final ProductEntity? selectedProduct;
  final List<String> categories;
  final String? errorMessage;
  final String? activeCategory;
  final String? searchQuery;
  final SellerProfileEntity? sellerProfile;
  final ProductStatus sellerProfileStatus;
  final String? sellerProfileError;
  final int currentPage;
  final bool hasMore;
  final bool isLoadingMore;

  const ProductState({
    this.status = ProductStatus.initial,
    this.products = const [],
    this.selectedProduct,
    this.categories = const [],
    this.errorMessage,
    this.activeCategory,
    this.searchQuery,
    this.sellerProfile,
    this.sellerProfileStatus = ProductStatus.initial,
    this.sellerProfileError,
    this.currentPage = 1,
    this.hasMore = true,
    this.isLoadingMore = false,
  });

  ProductState copyWith({
    ProductStatus? status,
    List<ProductEntity>? products,
    ProductEntity? selectedProduct,
    List<String>? categories,
    String? errorMessage,
    String? activeCategory,
    String? searchQuery,
    SellerProfileEntity? sellerProfile,
    ProductStatus? sellerProfileStatus,
    String? sellerProfileError,
    int? currentPage,
    bool? hasMore,
    bool? isLoadingMore,
  }) {
    return ProductState(
      status: status ?? this.status,
      products: products ?? this.products,
      selectedProduct: selectedProduct ?? this.selectedProduct,
      categories: categories ?? this.categories,
      errorMessage: errorMessage,
      activeCategory: activeCategory ?? this.activeCategory,
      searchQuery: searchQuery ?? this.searchQuery,
      sellerProfile: sellerProfile ?? this.sellerProfile,
      sellerProfileStatus: sellerProfileStatus ?? this.sellerProfileStatus,
      sellerProfileError: sellerProfileError,
      currentPage: currentPage ?? this.currentPage,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [
        status,
        products,
        selectedProduct,
        categories,
        errorMessage,
        activeCategory,
        searchQuery,
        sellerProfile,
        sellerProfileStatus,
        sellerProfileError,
        currentPage,
        hasMore,
        isLoadingMore,
      ];
}
