import 'dart:convert';
import 'package:dio/dio.dart';
import '../../../products/data/models/product_model.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/seller_status_result.dart';
import '../models/seller_order_model.dart';

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

  Future<List<SellerOrderData>> getSellerOrders() async {
    try {
      final response = await _dio.get('/seller/orders');
      final data = response.data;
      final List list =
          data is List ? data : (data['orders'] ?? data['data'] ?? []);
      return list
          .map((e) => SellerOrderData.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// HTTP 202 means the payment capture is still resolving (`resolving`);
  /// Dio does not throw on 2xx, so the status code is read from the response.
  Future<SellerStatusResult> updateOrderStatus(String orderId, String status,
      {String? cancelReason}) async {
    try {
      final body = <String, dynamic>{'status': status};
      if (cancelReason != null && cancelReason.isNotEmpty) {
        body['cancelReason'] = cancelReason;
      }
      final response =
          await _dio.put('/seller/orders/$orderId/status', data: body);
      return response.statusCode == 202
          ? SellerStatusResult.resolving
          : SellerStatusResult.completed;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (e.type == DioExceptionType.badResponse && data is Map) {
        final code = data['code'];
        throw SellerOrderException(mapDioError(e),
            code: code is String ? code : null);
      }
      throw mapDioError(e);
    }
  }

  Future<String> uploadVariantImage(String filePath) async {
    try {
      final fileName = filePath.split(RegExp(r'[/\\]')).last;
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(filePath, filename: fileName),
      });
      final response = await _dio.post('/products/variant-image', data: formData);
      return response.data['url'] as String;
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<dynamic> _buildPayload(
      Map<String, dynamic> data, List<String> imagePaths) async {
    if (imagePaths.isEmpty) return data;
    final formData = FormData();
    data.forEach((key, value) {
      final encoded = value is List || value is Map
          ? jsonEncode(value)
          : value.toString();
      formData.fields.add(MapEntry(key, encoded));
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
