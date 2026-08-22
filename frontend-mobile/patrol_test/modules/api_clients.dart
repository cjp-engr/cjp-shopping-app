import 'package:dio/dio.dart';

// Android emulator → host machine's localhost
import '../test_credentials.dart';

const _baseUrl = '${TestCredentials.baseUrl}/api';

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
    assert(_token != null, 'Call login() before using SellerApiClient');
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

  Future<String> createVariantProduct(String name) async {
    assert(_token != null, 'Call login() before using SellerApiClient');
    final res = await _dio.post(
      '/seller/products',
      data: {
        'name': name,
        'description': 'E2E test variant product — auto-created by Patrol',
        'category': 'Clothing',
        'condition': 'new',
        'price': 29.99,
        'stock': 0,
        'shippingOptions': ['standard'],
        'shippingFee': 'free',
        'variantAttributes': [
          {
            'name': 'Size',
            'values': ['S', 'M', 'L'],
          }
        ],
        'variants': [
          {
            'attributes': {'Size': 'S'},
            'price': 24.99,
            'stock': 5
          },
          {
            'attributes': {'Size': 'M'},
            'price': 29.99,
            'stock': 5
          },
          {
            'attributes': {'Size': 'L'},
            'price': 34.99,
            'stock': 5
          },
        ],
      },
      options: Options(headers: {'Authorization': 'Bearer $_token'}),
    );
    return res.data['product']['_id'] as String;
  }

  Future<String> findProductByName(String name) async {
    assert(_token != null, 'Call login() before using SellerApiClient');
    final res = await _dio.get(
      '/seller/products',
      options: Options(headers: {'Authorization': 'Bearer $_token'}),
    );
    final products = res.data['products'] as List;
    final match = products.firstWhere(
      (p) => p['name'] == name,
      orElse: () => throw StateError('Product not found: $name'),
    );
    return match['_id'] as String;
  }

  Future<void> deleteProduct(String id) async {
    assert(_token != null, 'Call login() before using SellerApiClient');
    await _dio.delete(
      '/seller/products/$id',
      options: Options(headers: {'Authorization': 'Bearer $_token'}),
    );
  }

  Future<Map<String, dynamic>> getProduct(String id) async {
    assert(_token != null, 'Call login() before using SellerApiClient');
    final res = await _dio.get(
      '/products/$id',
      options: Options(headers: {'Authorization': 'Bearer $_token'}),
    );
    return res.data['product'] as Map<String, dynamic>;
  }

  double? variantPrice(Map<String, dynamic> product, String size) {
    final variants = product['variants'] as List<dynamic>? ?? [];
    for (final raw in variants) {
      final variant = raw as Map<String, dynamic>;
      final attrs = variant['attributes'] as Map<String, dynamic>?;
      if (attrs?['Size'] == size) {
        return (variant['price'] as num).toDouble();
      }
    }
    return null;
  }
}
