import 'package:equatable/equatable.dart';

sealed class OrderEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

final class OrdersLoadRequested extends OrderEvent {
  final String userId;
  OrdersLoadRequested(this.userId);

  @override
  List<Object?> get props => [userId];
}

final class OrderCreateRequested extends OrderEvent {
  final Map<String, dynamic> orderData;
  OrderCreateRequested(this.orderData);

  @override
  List<Object?> get props => [orderData];
}

final class OrderCancelRequested extends OrderEvent {
  final String orderId;
  final String userId;
  OrderCancelRequested(this.orderId, this.userId);

  @override
  List<Object?> get props => [orderId, userId];
}

final class OrderConfirmReceivedRequested extends OrderEvent {
  final String orderId;
  OrderConfirmReceivedRequested(this.orderId);

  @override
  List<Object?> get props => [orderId];
}
