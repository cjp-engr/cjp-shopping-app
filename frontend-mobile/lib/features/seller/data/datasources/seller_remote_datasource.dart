import 'package:dio/dio.dart';
import '../../../products/data/models/product_model.dart';
import '../../../../core/network/api_client.dart';

class SellerRemoteDataSource {
  final Dio _dio;
  SellerRemoteDataSource(this._dio);

  Future<List<ProductModel>> getMyProducts() async {
    try {
      final response = await _dio.get('/seller/products');
      final data = response.data;
      final List list =
          data is List ? data : (data['products'] ?? data['data'] ?? []);
      return list
          .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<ProductModel> createProduct(Map<String, dynamic> data,
      {List<String> imagePaths = const []}) async {
    try {
      final payload = await _buildPayload(data, imagePaths);
      final response = await _dio.post('/seller/products', data: payload);
      final resData = response.data;
      final productData = resData is Map && resData['product'] != null
          ? resData['product']
          : resData;
      return ProductModel.fromJson(productData as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<ProductModel> updateProduct(String id, Map<String, dynamic> data,
      {List<String> imagePaths = const []}) async {
    try {
      final payload = await _buildPayload(data, imagePaths);
      final response = await _dio.put('/seller/products/$id', data: payload);
      final resData = response.data;
      final productData = resData is Map && resData['product'] != null
          ? resData['product']
          : resData;
      return ProductModel.fromJson(productData as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      await _dio.delete('/seller/products/$id');
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<dynamic> _buildPayload(
      Map<String, dynamic> data, List<String> imagePaths) async {
    if (imagePaths.isEmpty) return data;
    final formData = FormData();
    data.forEach((key, value) {
      formData.fields.add(MapEntry(key, value.toString()));
    });
    for (final path in imagePaths) {
      final fileName = path.split(RegExp(r'[/\\]')).last;
      formData.files.add(MapEntry(
        'images',
        await MultipartFile.fromFile(path, filename: fileName),
      ));
    }
    return formData;
  }
}
