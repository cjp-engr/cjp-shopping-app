part of 'checkout_bloc.dart';

sealed class CheckoutState extends Equatable {
  const CheckoutState();

  @override
  List<Object?> get props => [];
}

class CheckoutInitial extends CheckoutState {
  const CheckoutInitial();
}

class PaymentPending extends CheckoutState {
  const PaymentPending();
}

class OrderCreated extends CheckoutState {
  final OrderEntity order;
  final List<OrderEntity> allOrders;

  const OrderCreated(this.order, {this.allOrders = const []});

  @override
  List<Object?> get props => [order, allOrders];
}

class OrderCreationFailed extends CheckoutState {
  final String errorMessage;

  const OrderCreationFailed(this.errorMessage);

  @override
  List<Object?> get props => [errorMessage];
}
