import 'dart:developer' as developer;
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/core/services/seller_payment_result.dart';
import 'package:toko_mart/core/services/stripe_service.dart';
import 'package:toko_mart/features/checkout/data/checkout_attempt_store.dart';
import 'package:toko_mart/features/checkout/data/checkout_session_api.dart';
import 'package:toko_mart/features/checkout/models/checkout_session_view.dart';

part 'payment_event.dart';
part 'payment_state.dart';

const String _paymentMethodsEndpoint = '/auth/payment-methods';
const String _createIntentEndpoint = '/payments/create-intent';

/// Holds one seller's payment in Stripe. Injectable so the bloc can be tested without the SDK.
typedef SellerPaymentConfirmer = Future<SellerPaymentResult> Function(String clientSecret, String? paymentMethodId);

/// Reads a seller's payment state in Stripe without confirming it.
typedef SellerPaymentReader = Future<SellerPaymentResult> Function(String clientSecret);

const String _messageNotReady =
    'Payment is not finished for every seller yet. Complete the remaining payments to place your order.';
const String _messageUnknownAuthorization =
    'We could not confirm the payment for this seller. Your checkout is saved; try again to continue.';
const String _messageCheckoutEnded = 'This checkout has ended. Review your cart and start again.';
const String _messageCartChanged =
    'Your cart or delivery details changed since you started checkout. Review your order and place it again.';
const String _messageAuthorizationRejected =
    'Payment could not be authorized for a seller. Reserved items were released; review your cart and try again.';
const String _messageCannotComplete =
    'This checkout can no longer be completed. Its reserved items were released; review your cart and try again.';
const String _messageFinalizing = 'Your order is being placed. Please wait a moment.';
const String _messageResumeUnreachable = 'We could not reach your checkout. Try again.';
const String _messageNoCard = 'Choose a payment method to continue.';

String _randomIdempotencyKey() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  return 'checkout-${bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join()}';
}

class PaymentBloc extends Bloc<PaymentEvent, PaymentState> {
  final Dio apiService;
  final CheckoutSessionApi _checkoutApi;
  final CheckoutAttemptStore _attempts;
  final SellerPaymentConfirmer _confirmSellerPayment;
  final SellerPaymentReader _readSellerPayment;
  final String Function() _newIdempotencyKey;

  String? _currentPaymentMethodId;
  String? _currentPaymentIntentId;
  bool _shouldSaveCard = false;
  String? _buyerId;

  PaymentBloc({
    required this.apiService,
    CheckoutSessionApi? checkoutApi,
    CheckoutAttemptStore? attemptStore,
    SellerPaymentConfirmer? confirmSellerPayment,
    SellerPaymentReader? readSellerPayment,
    String Function()? newIdempotencyKey,
  })  : _checkoutApi = checkoutApi ?? CheckoutSessionApi(apiService),
        _attempts = attemptStore ?? const SharedPreferencesCheckoutAttemptStore(),
        _confirmSellerPayment = confirmSellerPayment ??
            ((clientSecret, paymentMethodId) =>
                StripeService.confirmPayment(clientSecret, paymentMethodId: paymentMethodId)),
        _readSellerPayment = readSellerPayment ?? StripeService.readSellerPayment,
        _newIdempotencyKey = newIdempotencyKey ?? _randomIdempotencyKey,
        super(const PaymentInitial()) {
    on<LoadSavedPaymentMethods>(_onLoadSavedPaymentMethods);
    on<SelectSavedPaymentMethod>(_onSelectSavedPaymentMethod);
    on<SetDefaultPaymentMethod>(_onSetDefaultPaymentMethod);
    on<DeletePaymentMethod>(_onDeletePaymentMethod);
    on<SelectNewCard>(_onSelectNewCard);
    on<SetSaveCardFlag>(_onSetSaveCardFlag);
    on<CreatePaymentIntent>(_onCreatePaymentIntent);
    on<ConfirmPayment>(_onConfirmPayment);
    on<SaveNewCard>(_onSaveNewCard);
    on<ResetPaymentState>(_onResetPaymentState);
    // Checkout steps run one at a time: a seller's hold must finish before the next step reads the session.
    on<CreateCheckoutSession>(_onCreateCheckoutSession, transformer: _sequential());
    on<ConfirmSellerAuthorization>(_onConfirmSellerAuthorization, transformer: _sequential());
    on<FinalizeCheckoutSession>(_onFinalizeCheckoutSession, transformer: _sequential());
    on<ResumeCheckoutSession>(_onResumeCheckoutSession, transformer: _sequential());
  }

  static EventTransformer<E> _sequential<E>() => (events, mapper) => events.asyncExpand(mapper);

  SavedPaymentMethod _mapToPaymentMethod(Map<String, dynamic> data) {
    return SavedPaymentMethod(
      id: (data['_id'] ?? data['id'] ?? '').toString(),
      brand: (data['brand'] ?? '').toString(),
      last4: (data['last4'] ?? '').toString(),
      expiryMonth: int.tryParse('${data['expiryMonth'] ?? ''}') ?? 0,
      expiryYear: int.tryParse('${data['expiryYear'] ?? ''}') ?? 0,
      isDefault: data['isDefault'] == true,
      stripePaymentMethodId: data['stripePaymentMethodId']?.toString(),
    );
  }

  Future<void> _onLoadSavedPaymentMethods(
    LoadSavedPaymentMethods event,
    Emitter<PaymentState> emit,
  ) async {
    emit(const LoadingSavedPaymentMethods());
    try {
      developer.log('Loading saved payment methods', name: 'PaymentBloc');
      final response = await apiService.get(_paymentMethodsEndpoint);
      final responseData = response.data['data'] ?? response.data;
      final list = (responseData['paymentMethods'] as List?) ?? [];
      final methods = list.map((pm) => _mapToPaymentMethod(pm as Map<String, dynamic>)).toList();
      developer.log('Loaded ${methods.length} payment methods', name: 'PaymentBloc');
      emit(PaymentMethodsLoaded(savedMethods: methods));
    } catch (e) {
      developer.log('Failed to load payment methods: $e', name: 'PaymentBloc', level: 1000);
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.savedCardsFetchFailed,
      ));
    }
  }

  void _onSelectSavedPaymentMethod(
    SelectSavedPaymentMethod event,
    Emitter<PaymentState> emit,
  ) {
    _currentPaymentMethodId = event.paymentMethodId;
    _shouldSaveCard = false;

    final currentState = state;
    final existingMethods = currentState is PaymentMethodsLoaded
        ? currentState.savedMethods
        : <SavedPaymentMethod>[];

    final selectedMethod = existingMethods.firstWhere(
      (m) => m.id == event.paymentMethodId,
      orElse: () => SavedPaymentMethod(
        id: event.paymentMethodId,
        brand: event.brand,
        last4: event.last4,
        expiryMonth: 0,
        expiryYear: 0,
        isDefault: false,
      ),
    );

    emit(PaymentMethodsLoaded(
      savedMethods: existingMethods,
      selectedMethod: selectedMethod,
    ));
  }

  Future<void> _onSetDefaultPaymentMethod(
    SetDefaultPaymentMethod event,
    Emitter<PaymentState> emit,
  ) async {
    try {
      developer.log('Setting payment method ${event.paymentMethodId} as default', name: 'PaymentBloc');

      await apiService.patch(
        '$_paymentMethodsEndpoint/${event.paymentMethodId}/default',
      );

      developer.log('Reloading payment methods after default update', name: 'PaymentBloc');
      final response = await apiService.get(_paymentMethodsEndpoint);
      final responseData = response.data['data'] ?? response.data;
      final list = (responseData['paymentMethods'] as List?) ?? [];
      final methods = list
          .whereType<Map<String, dynamic>>()
          .map(_mapToPaymentMethod)
          .toList();

      developer.log('Default payment method updated successfully', name: 'PaymentBloc');
      emit(PaymentMethodsLoaded(savedMethods: methods));
    } catch (e) {
      developer.log('Failed to set default payment method: $e', name: 'PaymentBloc', level: 1000);
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.failedToSetDefaultPaymentMethod,
      ));
    }
  }

  Future<void> _onDeletePaymentMethod(
    DeletePaymentMethod event,
    Emitter<PaymentState> emit,
  ) async {
    try {
      developer.log('Deleting payment method ${event.paymentMethodId}', name: 'PaymentBloc');

      await apiService.delete('$_paymentMethodsEndpoint/${event.paymentMethodId}');

      developer.log('Reloading payment methods after deletion', name: 'PaymentBloc');
      final response = await apiService.get(_paymentMethodsEndpoint);
      final responseData = response.data['data'] ?? response.data;
      final list = (responseData['paymentMethods'] as List?) ?? [];
      final methods = list
          .whereType<Map<String, dynamic>>()
          .map(_mapToPaymentMethod)
          .toList();

      developer.log('Payment method deleted successfully', name: 'PaymentBloc');
      emit(PaymentMethodsLoaded(savedMethods: methods));
    } catch (e) {
      developer.log('Failed to delete payment method: $e', name: 'PaymentBloc', level: 1000);
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.failedToDeleteCard,
      ));
    }
  }

  void _onSelectNewCard(SelectNewCard event, Emitter<PaymentState> emit) {
    _currentPaymentMethodId = null;
    _shouldSaveCard = false;
    emit(const NewCardSelected(shouldSave: false));
  }

  void _onSetSaveCardFlag(SetSaveCardFlag event, Emitter<PaymentState> emit) {
    _shouldSaveCard = event.shouldSave;
    emit(NewCardSelected(shouldSave: event.shouldSave));
  }

  Future<void> _onCreatePaymentIntent(
    CreatePaymentIntent event,
    Emitter<PaymentState> emit,
  ) async {
    if (_currentPaymentMethodId == null) {
      developer.log('No payment method selected', name: 'PaymentBloc', level: 1000);
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.paymentInitiationFailed,
        errorCode: 'no_payment_method',
      ));
      return;
    }

    emit(const CreatingPaymentIntent());
    try {
      developer.log('Creating payment intent: amount=${event.amountInCents}¢', name: 'PaymentBloc');

      final response = await apiService.post(_createIntentEndpoint, data: {
        'amountInCents': event.amountInCents,
        'stripePaymentMethodId': _currentPaymentMethodId,
      });

      final responseData = response.data['data'] ?? response.data;
      final intentId = (responseData['paymentIntentId'] ?? '').toString();
      final secret = (responseData['clientSecret'] ?? '').toString();

      if (intentId.isEmpty || secret.isEmpty) {
        developer.log('Invalid response: missing intentId or secret', name: 'PaymentBloc', level: 1000);
        emit(const PaymentFailed(
          errorMessage: StripeErrorMessages.paymentInitiationFailed,
        ));
        return;
      }

      _currentPaymentIntentId = intentId;

      developer.log('Payment intent created: $intentId', name: 'PaymentBloc');
      emit(PaymentIntentCreated(
        clientSecret: secret,
        paymentIntentId: intentId,
      ));
    } catch (e) {
      developer.log('Error creating payment intent: $e', name: 'PaymentBloc', level: 1000);
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.paymentInitiationFailed,
      ));
    }
  }

  Future<void> _onConfirmPayment(
    ConfirmPayment event,
    Emitter<PaymentState> emit,
  ) async {
    emit(const ConfirmingPayment());
    try {
      developer.log('Confirming payment', name: 'PaymentBloc');
      final result = await StripeService.confirmPayment(event.clientSecret);

      switch (result.outcome) {
        case SellerPaymentOutcome.requiresCapture:
        case SellerPaymentOutcome.succeeded:
          final paymentIntentId = _currentPaymentIntentId ?? '';
          developer.log('Payment confirmed: $paymentIntentId', name: 'PaymentBloc');
          emit(PaymentSucceeded(paymentIntentId: paymentIntentId));
        case SellerPaymentOutcome.canceledByUser:
        case SellerPaymentOutcome.failed:
        case SellerPaymentOutcome.unknown:
          final code = result.errorCode ?? 'unknown_error';
          developer.log('Payment confirmation error: outcome=${result.outcome.name}, code=$code', name: 'PaymentBloc', level: 1000);
          emit(PaymentFailed(
            errorMessage: StripeErrorMessages.getErrorMessage(code),
            errorCode: code,
          ));
      }
    } catch (e) {
      developer.log('Error confirming payment: $e', name: 'PaymentBloc', level: 1000);
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.paymentConfirmationFailed,
      ));
    }
  }

  Future<void> _onSaveNewCard(
    SaveNewCard event,
    Emitter<PaymentState> emit,
  ) async {
    if (!_shouldSaveCard) {
      developer.log('Card save disabled by user', name: 'PaymentBloc');
      return;
    }

    emit(const SavingCard());
    try {
      developer.log('Saving new card: ${event.brand} ${event.last4}', name: 'PaymentBloc');

      await apiService.post(_paymentMethodsEndpoint, data: {
        'type': 'credit-card',
        'brand': event.brand,
        'last4': event.last4,
        'expiryMonth': event.expiryMonth.toString(),
        'expiryYear': event.expiryYear.toString(),
        'stripePaymentMethodId': event.paymentMethodId,
        'setAsDefault': false,
      });

      developer.log('Card saved successfully', name: 'PaymentBloc');
    } catch (e) {
      developer.log('Failed to save card: $e', name: 'PaymentBloc', level: 1000);
      emit(const CardSaveFailed(message: StripeErrorMessages.cardSaveFailed));
    }
  }

  Future<void> _onCreateCheckoutSession(
    CreateCheckoutSession event,
    Emitter<PaymentState> emit,
  ) async {
    _buyerId = event.buyerId;
    emit(const CheckoutSessionStarting());

    // Reuse the stored key so a retry after a restart replays the same session instead of reserving stock again.
    final stored = await _attempts.load(event.buyerId);
    final attempt = stored ?? CheckoutAttempt(idempotencyKey: _newIdempotencyKey());
    if (stored == null) await _attempts.save(event.buyerId, attempt);

    try {
      developer.log('Creating checkout session', name: 'PaymentBloc');
      final result = await _checkoutApi.createSession(
        payload: event.payload,
        idempotencyKey: attempt.idempotencyKey,
      );
      await _attempts.save(event.buyerId, attempt.withSessionId(result.session.id));
      emit(CheckoutSessionInProgress(session: result.session));
    } on CheckoutApiException catch (e) {
      await _emitCheckoutFailure(event.buyerId, e, emit);
    }
  }

  Future<void> _emitCheckoutFailure(
    String buyerId,
    CheckoutApiException e,
    Emitter<PaymentState> emit,
  ) async {
    developer.log('Checkout request failed: code=${e.code}', name: 'PaymentBloc', level: 1000);
    switch (e.code) {
      case 'idempotency_conflict':
        // The cart or delivery details changed, so the stored key cannot be reused.
        await _attempts.clear(buyerId);
        emit(const CheckoutSessionEnded(message: _messageCartChanged, errorCode: 'idempotency_conflict'));
      case 'authorization_rejected':
        // The server has already released every hold for this session.
        await _attempts.clear(buyerId);
        emit(const CheckoutSessionEnded(message: _messageAuthorizationRejected, errorCode: 'authorization_rejected'));
      case 'session_expired':
      case 'session_closed':
        await _attempts.clear(buyerId);
        emit(CheckoutSessionEnded(message: _messageCheckoutEnded, errorCode: e.code));
      default:
        // Keep the attempt: retrying with the same key cannot reserve twice.
        emit(PaymentFailed(
          errorMessage: e.code == 'network_error'
              ? StripeErrorMessages.getErrorMessage('network_error')
              : e.message,
          errorCode: e.code,
        ));
    }
  }

  Future<void> _onConfirmSellerAuthorization(
    ConfirmSellerAuthorization event,
    Emitter<PaymentState> emit,
  ) async {
    final current = state;
    if (current is! CheckoutSessionInProgress || current.isFinalizing) return;
    final seller = current.session.sellerById(event.sellerId);
    final secret = seller?.clientSecret;
    if (seller == null || seller.authorized || secret == null) return;

    final paymentMethodId = event.paymentMethodId;
    if (paymentMethodId == null || paymentMethodId.isEmpty) {
      // Placed only after the card is chosen; this guards a resumed screen that has not created the session yet.
      emit(current.copyWith(stopMessage: _messageNoCard));
      return;
    }

    emit(current.copyWith(authorizingSellerId: event.sellerId, clearStopMessage: true));

    // A replayed session can list a seller whose hold already exists. Stripe is the source of truth,
    // so check before confirming a second time.
    var outcome = await _readSellerPayment(secret);
    if (outcome.outcome != SellerPaymentOutcome.requiresCapture) {
      outcome = await _confirmSellerPayment(secret, paymentMethodId);
    }

    switch (outcome.outcome) {
      case SellerPaymentOutcome.requiresCapture:
      case SellerPaymentOutcome.succeeded:
        _markAuthorized(event.sellerId, emit);
      case SellerPaymentOutcome.canceledByUser:
        _stopAuthorization(
          event.sellerId,
          StripeErrorMessages.getErrorMessage(outcome.errorCode),
          emit,
        );
      case SellerPaymentOutcome.failed:
        _stopAuthorization(
          event.sellerId,
          outcome.message ?? StripeErrorMessages.getErrorMessage(outcome.errorCode),
          emit,
        );
      case SellerPaymentOutcome.unknown:
        await _settleUnknownAuthorization(event.sellerId, secret, emit);
    }
  }

  /// Reads the session and Stripe before offering a retry, because the first confirmation may have gone through.
  Future<void> _settleUnknownAuthorization(
    String sellerId,
    String clientSecret,
    Emitter<PaymentState> emit,
  ) async {
    final current = state;
    if (current is! CheckoutSessionInProgress) return;

    CheckoutSessionView latest;
    try {
      latest = await _checkoutApi.getSession(current.session.id);
    } on CheckoutApiException {
      _stopAuthorization(sellerId, _messageUnknownAuthorization, emit);
      return;
    }
    if (latest.status != 'open') {
      await _endCheckout(_messageCheckoutEnded, 'session_${latest.status}', emit);
      return;
    }

    final read = await _readSellerPayment(clientSecret);
    if (read.outcome == SellerPaymentOutcome.requiresCapture) {
      _markAuthorized(sellerId, emit);
    } else {
      _stopAuthorization(sellerId, _messageUnknownAuthorization, emit);
    }
  }

  void _markAuthorized(String sellerId, Emitter<PaymentState> emit) {
    final current = state;
    if (current is! CheckoutSessionInProgress) return;
    final seller = current.session.sellerById(sellerId);
    if (seller == null) return;
    // The secret is no longer needed once the hold exists, so drop it from memory.
    final held = seller.copyWith(authorized: true, clearClientSecret: true);
    emit(current.copyWith(
      session: current.session.replaceSeller(held),
      clearAuthorizing: true,
      clearStopMessage: true,
    ));
  }

  void _stopAuthorization(String sellerId, String message, Emitter<PaymentState> emit) {
    final current = state;
    if (current is! CheckoutSessionInProgress) return;
    developer.log('Seller authorization stopped: seller=$sellerId', name: 'PaymentBloc', level: 1000);
    emit(current.copyWith(clearAuthorizing: true, stopMessage: message));
  }

  Future<void> _onFinalizeCheckoutSession(
    FinalizeCheckoutSession event,
    Emitter<PaymentState> emit,
  ) async {
    final current = state;
    if (current is! CheckoutSessionInProgress || current.isFinalizing) return;
    if (!current.session.allAuthorized) {
      emit(current.copyWith(stopMessage: _messageNotReady));
      return;
    }

    emit(current.copyWith(isFinalizing: true, clearStopMessage: true));
    try {
      final orderIds = await _checkoutApi.confirmSession(current.session.id);
      await _endPlaced(orderIds, emit);
    } on CheckoutApiException catch (e) {
      await _emitFinalizeFailure(e, emit);
    }
  }

  Future<void> _emitFinalizeFailure(CheckoutApiException e, Emitter<PaymentState> emit) async {
    developer.log('Finalize failed: code=${e.code}', name: 'PaymentBloc', level: 1000);
    final current = state;
    if (current is! CheckoutSessionInProgress) return;
    switch (e.code) {
      case 'authorization_not_ready':
        emit(current.copyWith(isFinalizing: false, stopMessage: _messageNotReady));
      case 'finalization_in_progress':
        emit(current.copyWith(isFinalizing: false, stopMessage: _messageFinalizing));
      case 'authorization_canceled':
      case 'authorization_mismatch':
      case 'authorization_deadline_invalid':
        await _endCheckout(_messageCannotComplete, e.code, emit);
      case 'session_expired':
      case 'session_closed':
        await _endCheckout(_messageCheckoutEnded, e.code, emit);
      default:
        emit(current.copyWith(isFinalizing: false, stopMessage: e.message));
    }
  }

  Future<void> _onResumeCheckoutSession(
    ResumeCheckoutSession event,
    Emitter<PaymentState> emit,
  ) async {
    _buyerId = event.buyerId;
    final attempt = await _attempts.load(event.buyerId);
    final sessionId = attempt?.sessionId;
    if (sessionId == null) {
      emit(const PaymentInitial());
      return;
    }

    emit(const CheckoutSessionStarting());
    try {
      final session = await _checkoutApi.getSession(sessionId);
      switch (session.status) {
        case 'open':
          emit(CheckoutSessionInProgress(session: session.withAuthorizationFromSecrets()));
        case 'placed':
          // Confirming a placed session returns its existing orders.
          await _endPlaced(await _checkoutApi.confirmSession(sessionId), emit);
        case 'finalizing':
          emit(CheckoutSessionInProgress(
            session: session.withAuthorizationFromSecrets(),
            stopMessage: _messageFinalizing,
          ));
        default:
          // expired or failed: the server has released the holds.
          await _endCheckout(_messageCheckoutEnded, 'session_${session.status}', emit);
      }
    } on CheckoutApiException catch (e) {
      if (e.code == 'session_not_found') {
        await _attempts.clear(event.buyerId);
        emit(const PaymentInitial());
        return;
      }
      // Keep the attempt: the session may still be there on the next try.
      emit(PaymentFailed(errorMessage: _messageResumeUnreachable, errorCode: e.code));
    }
  }

  Future<void> _endPlaced(List<String> orderIds, Emitter<PaymentState> emit) async {
    final buyerId = _buyerId;
    if (buyerId != null) await _attempts.clear(buyerId);
    developer.log('Checkout placed: ${orderIds.length} order(s)', name: 'PaymentBloc');
    emit(CheckoutSessionPlaced(orderIds: orderIds));
  }

  Future<void> _endCheckout(String message, String? errorCode, Emitter<PaymentState> emit) async {
    final buyerId = _buyerId;
    if (buyerId != null) await _attempts.clear(buyerId);
    emit(CheckoutSessionEnded(message: message, errorCode: errorCode));
  }

  void _onResetPaymentState(
    ResetPaymentState event,
    Emitter<PaymentState> emit,
  ) {
    _currentPaymentMethodId = null;
    _currentPaymentIntentId = null;
    _shouldSaveCard = false;
    emit(const PaymentInitial());
  }
}
