import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:toko_mart/features/orders/domain/entities/order_entity.dart';
import 'package:toko_mart/features/orders/domain/repositories/order_repository.dart';

part 'checkout_event.dart';
part 'checkout_state.dart';

/// Checkout-level coordinator: tracks that a payment is in flight and, once
/// payment succeeds, creates the order (with the Stripe paymentIntentId) via
/// the existing [OrderRepository] (POST /orders).
class CheckoutBloc extends Bloc<CheckoutEvent, CheckoutState> {
  final OrderRepository _orderRepository;

  CheckoutBloc(this._orderRepository) : super(const CheckoutInitial()) {
    on<InitiatePayment>((event, emit) => emit(const PaymentPending()));
    on<CheckoutPaymentSucceeded>(_onPaymentSucceeded);
  }

  Future<void> _onPaymentSucceeded(
    CheckoutPaymentSucceeded event,
    Emitter<CheckoutState> emit,
  ) async {
    emit(const PaymentPending());
    try {
      final orders = await _orderRepository.createOrder({
        ...event.orderData,
        'paymentIntentId': event.paymentIntentId,
      });
      if (orders.isEmpty) {
        emit(const OrderCreationFailed('Order was not created'));
        return;
      }
      emit(OrderCreated(orders.first, allOrders: orders));
    } catch (e) {
      emit(OrderCreationFailed(e.toString()));
    }
  }
}
