import '../../../products/domain/entities/product_entity.dart';
import '../../data/models/seller_order_model.dart';

abstract class SellerRepository {
  Future<List<ProductEntity>> getMyProducts();
  Future<ProductEntity> createProduct(Map<String, dynamic> data,
      {List<String> imagePaths = const []});
  Future<ProductEntity> updateProduct(String id, Map<String, dynamic> data,
      {List<String> imagePaths = const []});
  Future<void> deleteProduct(String id);
  Future<List<SellerOrderData>> getSellerOrders();
  Future<void> updateOrderStatus(String orderId, String status);
}
