import '../../domain/entities/order_entity.dart';
import '../../domain/repositories/order_repository.dart';
import '../datasources/order_remote_datasource.dart';

class OrderRepositoryImpl implements OrderRepository {
  final OrderRemoteDataSource _remote;
  OrderRepositoryImpl(this._remote);

  @override
  Future<List<OrderEntity>> getOrders(String userId) =>
      _remote.getOrders(userId);

  @override
  Future<OrderEntity> getOrder(String id) => _remote.getOrder(id);

  @override
  Future<List<OrderEntity>> createOrder(Map<String, dynamic> orderData) =>
      _remote.createOrder(orderData);

  @override
  Future<OrderEntity> cancelOrder(String id, String userId) =>
      _remote.cancelOrder(id, userId);

  @override
  Future<OrderEntity> confirmReceived(String id) =>
      _remote.confirmReceived(id);
}
