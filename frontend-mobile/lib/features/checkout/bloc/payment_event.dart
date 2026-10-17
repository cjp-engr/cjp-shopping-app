part of 'payment_bloc.dart';

abstract class PaymentEvent extends Equatable {
  const PaymentEvent();

  @override
  List<Object?> get props => [];
}

class LoadSavedPaymentMethods extends PaymentEvent {
  const LoadSavedPaymentMethods();
}

class SelectSavedPaymentMethod extends PaymentEvent {
  final String paymentMethodId;
  final String brand;
  final String last4;

  const SelectSavedPaymentMethod({
    required this.paymentMethodId,
    required this.brand,
    required this.last4,
  });

  @override
  List<Object?> get props => [paymentMethodId, brand, last4];
}

class SetDefaultPaymentMethod extends PaymentEvent {
  final String paymentMethodId;

  const SetDefaultPaymentMethod(this.paymentMethodId);

  @override
  List<Object?> get props => [paymentMethodId];
}

class DeletePaymentMethod extends PaymentEvent {
  final String paymentMethodId;

  const DeletePaymentMethod(this.paymentMethodId);

  @override
  List<Object?> get props => [paymentMethodId];
}

class SelectNewCard extends PaymentEvent {
  const SelectNewCard();
}

class SetSaveCardFlag extends PaymentEvent {
  final bool shouldSave;

  const SetSaveCardFlag(this.shouldSave);

  @override
  List<Object?> get props => [shouldSave];
}

class CreatePaymentIntent extends PaymentEvent {
  final int amountInCents;

  const CreatePaymentIntent(this.amountInCents);

  @override
  List<Object?> get props => [amountInCents];
}

class ConfirmPayment extends PaymentEvent {
  final String clientSecret;

  const ConfirmPayment(this.clientSecret);

  @override
  List<Object?> get props => [clientSecret];
}

class SaveNewCard extends PaymentEvent {
  final String paymentMethodId;
  final String brand;
  final String last4;
  final int expiryMonth;
  final int expiryYear;

  const SaveNewCard({
    required this.paymentMethodId,
    required this.brand,
    required this.last4,
    required this.expiryMonth,
    required this.expiryYear,
  });

  @override
  List<Object?> get props =>
      [paymentMethodId, brand, last4, expiryMonth, expiryYear];
}

class ResetPaymentState extends PaymentEvent {
  const ResetPaymentState();
}

/// Starts a card checkout session, or reuses the stored attempt's idempotency key.
class CreateCheckoutSession extends PaymentEvent {
  final String buyerId;
  final Map<String, dynamic> payload;

  const CreateCheckoutSession({required this.buyerId, required this.payload});

  @override
  List<Object?> get props => [buyerId, payload];
}

/// Holds one seller's payment, using the card the buyer chose ([paymentMethodId]: a new card's
/// PaymentMethod ID or a saved card's). Sellers are authorized one at a time, in the order the session lists them.
class ConfirmSellerAuthorization extends PaymentEvent {
  final String sellerId;
  final String? paymentMethodId;

  const ConfirmSellerAuthorization(this.sellerId, {this.paymentMethodId});

  @override
  List<Object?> get props => [sellerId, paymentMethodId];
}

/// Places the orders once every seller's payment is held.
class FinalizeCheckoutSession extends PaymentEvent {
  const FinalizeCheckoutSession();
}

/// Reopens the stored attempt after a restart or a reconnect. Never assumes no order exists.
class ResumeCheckoutSession extends PaymentEvent {
  final String buyerId;

  const ResumeCheckoutSession({required this.buyerId});

  @override
  List<Object?> get props => [buyerId];
}
