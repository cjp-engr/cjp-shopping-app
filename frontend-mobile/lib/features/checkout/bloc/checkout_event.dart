part of 'checkout_bloc.dart';

sealed class CheckoutEvent extends Equatable {
  const CheckoutEvent();

  @override
  List<Object?> get props => [];
}

/// User started the payment flow.
class InitiatePayment extends CheckoutEvent {
  const InitiatePayment();
}

/// Payment succeeded; create the order. Named `CheckoutPaymentSucceeded`
/// because `PaymentSucceeded` is already a PaymentState in payment_state.dart.
class CheckoutPaymentSucceeded extends CheckoutEvent {
  final String paymentIntentId;

  /// Cart/shipping payload for POST /orders (same shape as OrderCreateRequested).
  final Map<String, dynamic> orderData;

  const CheckoutPaymentSucceeded(this.paymentIntentId,
      {this.orderData = const {}});

  @override
  List<Object?> get props => [paymentIntentId, orderData];
}
