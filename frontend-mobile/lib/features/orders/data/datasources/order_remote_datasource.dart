import 'package:dio/dio.dart';
import '../models/order_model.dart';
import '../../../../core/network/api_client.dart';

class OrderRemoteDataSource {
  final Dio _dio;
  OrderRemoteDataSource(this._dio);

  Future<List<OrderModel>> getOrders(String userId) async {
    try {
      final response = await _dio.get('/orders',
          queryParameters: {'userId': userId});
      final data = response.data;
      final List list = data is List ? data : (data['orders'] ?? []);
      return list
          .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<OrderModel> getOrder(String id) async {
    try {
      final response = await _dio.get('/orders/$id');
      final data = response.data;
      final orderData =
          data is Map && data['order'] != null ? data['order'] : data;
      return OrderModel.fromJson(orderData as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<OrderModel>> createOrder(Map<String, dynamic> orderData) async {
    try {
      final response = await _dio.post('/orders', data: orderData);
      final data = response.data;
      // Backend now returns { orders: [...] }
      final List raw = data is Map ? (data['orders'] ?? []) : [];
      return raw
          .map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<OrderModel> cancelOrder(String id, String userId) async {
    try {
      final response = await _dio.put('/orders/$id/status',
          data: {'status': 'cancelled', 'userId': userId});
      final data = response.data;
      final result =
          data is Map && data['order'] != null ? data['order'] : data;
      return OrderModel.fromJson(result as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}
