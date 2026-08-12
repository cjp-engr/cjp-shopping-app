import 'package:dio/dio.dart';

// Android emulator → host machine's localhost
const _baseUrl = 'http://10.0.2.2:5000/api';

final class SellerApiClient {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));

  String? _token;

  Future<void> login(String email, String password) async {
    final res = await _dio.post(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    _token = res.data['token'] as String;
  }

  Future<String> createSimpleProduct(String name) async {
    final res = await _dio.post(
      '/seller/products',
      data: {
        'name': name,
        'description': 'E2E test product — auto-created by Patrol',
        'category': 'Home & Garden',
        'condition': 'new',
        'price': 29.99,
        'stock': 10,
        'shippingOptions': ['standard'],
        'shippingFee': 'free',
      },
      options: Options(headers: {'Authorization': 'Bearer $_token'}),
    );
    return res.data['product']['_id'] as String;
  }

  Future<void> deleteProduct(String id) async {
    await _dio.delete(
      '/seller/products/$id',
      options: Options(headers: {'Authorization': 'Bearer $_token'}),
    );
  }
}
