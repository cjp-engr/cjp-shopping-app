import 'package:equatable/equatable.dart';
import '../../domain/entities/order_entity.dart';

enum OrderStatus { initial, loading, success, placing, placed, failure }

class OrderState extends Equatable {
  final OrderStatus status;
  final List<OrderEntity> orders;
  final OrderEntity? placedOrder;
  final String? errorMessage;

  const OrderState({
    this.status = OrderStatus.initial,
    this.orders = const [],
    this.placedOrder,
    this.errorMessage,
  });

  OrderState copyWith({
    OrderStatus? status,
    List<OrderEntity>? orders,
    OrderEntity? placedOrder,
    String? errorMessage,
  }) {
    return OrderState(
      status: status ?? this.status,
      orders: orders ?? this.orders,
      placedOrder: placedOrder ?? this.placedOrder,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, orders, placedOrder, errorMessage];
}
