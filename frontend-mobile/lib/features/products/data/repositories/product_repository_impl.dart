import '../../domain/entities/product_entity.dart';
import '../../domain/repositories/product_repository.dart';
import '../datasources/product_remote_datasource.dart';

class ProductRepositoryImpl implements ProductRepository {
  final ProductRemoteDataSource _remote;
  ProductRepositoryImpl(this._remote);

  @override
  Future<List<ProductEntity>> getProducts({
    String? search,
    String? category,
    double? minPrice,
    double? maxPrice,
    String? sortBy,
    String? sortOrder,
    int page = 1,
    int limit = 20,
  }) =>
      _remote.getProducts(
        search: search,
        category: category,
        minPrice: minPrice,
        maxPrice: maxPrice,
        sortBy: sortBy,
        sortOrder: sortOrder,
        page: page,
        limit: limit,
      );

  @override
  Future<ProductEntity> getProduct(String id) => _remote.getProduct(id);

  @override
  Future<List<String>> getCategories() => _remote.getCategories();
}
