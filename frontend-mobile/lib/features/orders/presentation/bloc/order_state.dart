import 'package:equatable/equatable.dart';
import '../../domain/entities/order_entity.dart';

enum OrderStatus { initial, loading, success, placing, placed, failure }

class OrderState extends Equatable {
  final OrderStatus status;
  final List<OrderEntity> orders;
  final List<OrderEntity> placedOrders;
  final String? errorMessage;

  const OrderState({
    this.status = OrderStatus.initial,
    this.orders = const [],
    this.placedOrders = const [],
    this.errorMessage,
  });

  OrderState copyWith({
    OrderStatus? status,
    List<OrderEntity>? orders,
    List<OrderEntity>? placedOrders,
    String? errorMessage,
  }) {
    return OrderState(
      status: status ?? this.status,
      orders: orders ?? this.orders,
      placedOrders: placedOrders ?? this.placedOrders,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, orders, placedOrders, errorMessage];
}
