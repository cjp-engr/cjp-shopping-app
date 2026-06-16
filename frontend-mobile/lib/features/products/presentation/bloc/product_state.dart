import 'package:equatable/equatable.dart';
import '../../domain/entities/product_entity.dart';

enum ProductStatus { initial, loading, success, failure }

class ProductState extends Equatable {
  final ProductStatus status;
  final List<ProductEntity> products;
  final ProductEntity? selectedProduct;
  final List<String> categories;
  final String? errorMessage;
  final String? activeCategory;
  final String? searchQuery;

  const ProductState({
    this.status = ProductStatus.initial,
    this.products = const [],
    this.selectedProduct,
    this.categories = const [],
    this.errorMessage,
    this.activeCategory,
    this.searchQuery,
  });

  ProductState copyWith({
    ProductStatus? status,
    List<ProductEntity>? products,
    ProductEntity? selectedProduct,
    List<String>? categories,
    String? errorMessage,
    String? activeCategory,
    String? searchQuery,
  }) {
    return ProductState(
      status: status ?? this.status,
      products: products ?? this.products,
      selectedProduct: selectedProduct ?? this.selectedProduct,
      categories: categories ?? this.categories,
      errorMessage: errorMessage,
      activeCategory: activeCategory ?? this.activeCategory,
      searchQuery: searchQuery ?? this.searchQuery,
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
      ];
}
