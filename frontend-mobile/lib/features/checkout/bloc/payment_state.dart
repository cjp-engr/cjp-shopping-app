part of 'payment_bloc.dart';

class SavedPaymentMethod extends Equatable {
  final String id;
  final String brand;
  final String last4;
  final int expiryMonth;
  final int expiryYear;
  final bool isDefault;
  final String? stripePaymentMethodId;

  const SavedPaymentMethod({
    required this.id,
    required this.brand,
    required this.last4,
    required this.expiryMonth,
    required this.expiryYear,
    required this.isDefault,
    this.stripePaymentMethodId,
  });

  @override
  List<Object?> get props =>
      [id, brand, last4, expiryMonth, expiryYear, isDefault, stripePaymentMethodId];
}

abstract class PaymentState extends Equatable {
  const PaymentState();

  @override
  List<Object?> get props => [];
}

class PaymentInitial extends PaymentState {
  const PaymentInitial();
}

class LoadingSavedPaymentMethods extends PaymentState {
  const LoadingSavedPaymentMethods();
}

class PaymentMethodsLoaded extends PaymentState {
  final List<SavedPaymentMethod> savedMethods;
  final SavedPaymentMethod? selectedMethod;

  const PaymentMethodsLoaded({
    required this.savedMethods,
    this.selectedMethod,
  });

  @override
  List<Object?> get props => [savedMethods, selectedMethod];
}

class NewCardSelected extends PaymentState {
  final bool shouldSave;

  const NewCardSelected({this.shouldSave = false});

  @override
  List<Object?> get props => [shouldSave];
}

class CreatingPaymentIntent extends PaymentState {
  const CreatingPaymentIntent();
}

class PaymentIntentCreated extends PaymentState {
  final String clientSecret;
  final String paymentIntentId;

  const PaymentIntentCreated({
    required this.clientSecret,
    required this.paymentIntentId,
  });

  @override
  List<Object?> get props => [clientSecret, paymentIntentId];
}

class ConfirmingPayment extends PaymentState {
  const ConfirmingPayment();
}

class PaymentSucceeded extends PaymentState {
  final String paymentIntentId;

  const PaymentSucceeded({required this.paymentIntentId});

  @override
  List<Object?> get props => [paymentIntentId];
}

class SavingCard extends PaymentState {
  const SavingCard();
}

class CardSaveFailed extends PaymentState {
  final String message;

  const CardSaveFailed({required this.message});

  @override
  List<Object?> get props => [message];
}

class PaymentFailed extends PaymentState {
  final String errorMessage;
  final String? errorCode;

  const PaymentFailed({required this.errorMessage, this.errorCode});

  @override
  List<Object?> get props => [errorMessage, errorCode];
}

class PaymentCancelled extends PaymentState {
  const PaymentCancelled();
}

/// Loading the session (create or resume).
class CheckoutSessionStarting extends PaymentState {
  const CheckoutSessionStarting();
}

/// The session is open. Per-seller progress is on [session]: each seller is authorized or still pending.
class CheckoutSessionInProgress extends PaymentState {
  final CheckoutSessionView session;

  /// The seller whose payment is being held right now.
  final String? authorizingSellerId;

  /// Why the last step stopped and what the buyer can do next. Null when nothing needs attention.
  final String? stopMessage;

  /// True while the orders are being placed.
  final bool isFinalizing;

  const CheckoutSessionInProgress({
    required this.session,
    this.authorizingSellerId,
    this.stopMessage,
    this.isFinalizing = false,
  });

  CheckoutSessionInProgress copyWith({
    CheckoutSessionView? session,
    String? authorizingSellerId,
    bool clearAuthorizing = false,
    String? stopMessage,
    bool clearStopMessage = false,
    bool? isFinalizing,
  }) {
    return CheckoutSessionInProgress(
      session: session ?? this.session,
      authorizingSellerId: clearAuthorizing ? null : (authorizingSellerId ?? this.authorizingSellerId),
      stopMessage: clearStopMessage ? null : (stopMessage ?? this.stopMessage),
      isFinalizing: isFinalizing ?? this.isFinalizing,
    );
  }

  @override
  List<Object?> get props => [session, authorizingSellerId, stopMessage, isFinalizing];
}

/// Terminal: the orders are placed.
class CheckoutSessionPlaced extends PaymentState {
  final List<String> orderIds;

  const CheckoutSessionPlaced({required this.orderIds});

  @override
  List<Object?> get props => [orderIds];
}

/// Terminal: the checkout cannot continue (expired, failed, or the cart changed). The stored attempt is cleared.
class CheckoutSessionEnded extends PaymentState {
  final String message;
  final String? errorCode;

  const CheckoutSessionEnded({required this.message, this.errorCode});

  @override
  List<Object?> get props => [message, errorCode];
}
