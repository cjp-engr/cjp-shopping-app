import '../entities/product_entity.dart';
import '../entities/seller_profile_entity.dart';

abstract class ProductRepository {
  Future<List<ProductEntity>> getProducts({
    String? search,
    String? category,
    double? minPrice,
    double? maxPrice,
    String? sort,
    int page = 1,
    int limit = 20,
  });

  Future<ProductEntity> getProduct(String id);
  Future<List<String>> getCategories();
  Future<SellerProfileEntity> getSellerProfile(String sellerId);
}
