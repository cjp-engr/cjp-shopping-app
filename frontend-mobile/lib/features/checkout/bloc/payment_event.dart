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
