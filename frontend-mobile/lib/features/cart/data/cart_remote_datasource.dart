import 'package:dio/dio.dart';
import '../domain/entities/cart_item_entity.dart';
import '../../products/data/models/product_model.dart';
import '../../../core/network/api_client.dart';

class CartRemoteDataSource {
  final Dio _dio;
  CartRemoteDataSource(this._dio);

  /// Fetch cart from server. Returns a flat list of items (seller info comes
  /// from the populated product.sellerId field).
  Future<List<CartItemEntity>> getCart() async {
    try {
      final response = await _dio.get('/cart');
      final sellers = response.data['sellers'] as List? ?? [];
      return _parseSellers(sellers);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// Replace the server cart with [items]. The backend groups them by seller.
  Future<List<CartItemEntity>> syncCart(List<CartItemEntity> items) async {
    try {
      final payload = items
          .map((i) => {'productId': i.product.id, 'quantity': i.quantity})
          .toList();
      final response = await _dio.put('/cart', data: {'items': payload});
      final sellers = response.data['sellers'] as List? ?? [];
      return _parseSellers(sellers);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// Clear all items on the server.
  Future<void> clearCart() async {
    try {
      await _dio.delete('/cart');
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  /// Flatten sellers[].items[] into a single list so the bloc/UI are unchanged.
  List<CartItemEntity> _parseSellers(List sellers) {
    final result = <CartItemEntity>[];
    for (final seller in sellers) {
      final sellerMap = seller as Map<String, dynamic>;
      final rawItems = sellerMap['items'] as List? ?? [];
      for (final e in rawItems) {
        final map = e as Map<String, dynamic>;
        final productJson = map['product'];
        final product = productJson is Map<String, dynamic>
            ? ProductModel.fromJson(productJson)
            : ProductModel.fromJson({'_id': productJson?.toString() ?? ''});
        final quantity = (map['quantity'] as num?)?.toInt() ?? 1;
        result.add(CartItemEntity(product: product, quantity: quantity));
      }
    }
    return result;
  }
}
