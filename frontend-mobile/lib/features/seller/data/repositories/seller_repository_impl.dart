import '../../../products/domain/entities/product_entity.dart';
import '../datasources/seller_remote_datasource.dart';
import '../../domain/repositories/seller_repository.dart';

class SellerRepositoryImpl implements SellerRepository {
  final SellerRemoteDataSource _dataSource;
  SellerRepositoryImpl(this._dataSource);

  @override
  Future<List<ProductEntity>> getMyProducts() => _dataSource.getMyProducts();

  @override
  Future<ProductEntity> createProduct(Map<String, dynamic> data,
          {List<String> imagePaths = const []}) =>
      _dataSource.createProduct(data, imagePaths: imagePaths);

  @override
  Future<ProductEntity> updateProduct(String id, Map<String, dynamic> data,
          {List<String> imagePaths = const []}) =>
      _dataSource.updateProduct(id, data, imagePaths: imagePaths);

  @override
  Future<void> deleteProduct(String id) => _dataSource.deleteProduct(id);
}
