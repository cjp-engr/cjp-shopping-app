import '../entities/product_entity.dart';

abstract class ProductRepository {
  Future<List<ProductEntity>> getProducts({
    String? search,
    String? category,
    double? minPrice,
    double? maxPrice,
    String? sortBy,
    String? sortOrder,
    int page = 1,
    int limit = 20,
  });

  Future<ProductEntity> getProduct(String id);
  Future<List<String>> getCategories();
}
