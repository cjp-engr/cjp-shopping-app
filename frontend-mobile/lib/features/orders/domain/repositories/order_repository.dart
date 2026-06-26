import '../entities/order_entity.dart';

abstract class OrderRepository {
  Future<List<OrderEntity>> getOrders(String userId);
  Future<OrderEntity> getOrder(String id);
  Future<List<OrderEntity>> createOrder(Map<String, dynamic> orderData);
  Future<OrderEntity> cancelOrder(String id, String userId);
  Future<OrderEntity> confirmReceived(String id);
}
