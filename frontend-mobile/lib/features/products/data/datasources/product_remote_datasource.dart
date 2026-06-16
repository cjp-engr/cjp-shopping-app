import 'package:dio/dio.dart';
import '../models/product_model.dart';
import '../../../../core/network/api_client.dart';

class ProductRemoteDataSource {
  final Dio _dio;
  ProductRemoteDataSource(this._dio);

  Future<List<ProductModel>> getProducts({
    String? search,
    String? category,
    double? minPrice,
    double? maxPrice,
    String? sortBy,
    String? sortOrder,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final params = <String, dynamic>{
        'page': page,
        'limit': limit,
        if (search != null && search.isNotEmpty) 'search': search,
        if (category != null && category.isNotEmpty) 'category': category,
        if (minPrice != null) 'minPrice': minPrice,
        if (maxPrice != null) 'maxPrice': maxPrice,
        if (sortBy != null) 'sortBy': sortBy,
        if (sortOrder != null) 'sortOrder': sortOrder,
      };
      final response = await _dio.get('/products', queryParameters: params);
      final data = response.data;
      final List list = data is List ? data : (data['products'] ?? data['data'] ?? []);
      return list.map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<ProductModel> getProduct(String id) async {
    try {
      final response = await _dio.get('/products/$id');
      final data = response.data;
      final productData = data is Map && data['product'] != null
          ? data['product']
          : data;
      return ProductModel.fromJson(productData as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<String>> getCategories() async {
    try {
      final response = await _dio.get('/products/categories/all');
      final data = response.data;
      final List list = data is List ? data : (data['categories'] ?? []);
      return list.map((e) => e.toString()).toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}
