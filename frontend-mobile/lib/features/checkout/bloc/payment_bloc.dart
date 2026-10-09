import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/core/services/stripe_service.dart';

part 'payment_event.dart';
part 'payment_state.dart';

const String _logTag = '[PaymentBloc]';
const String _paymentMethodsEndpoint = '/auth/payment-methods';
const String _createIntentEndpoint = '/payments/create-intent';

class PaymentBloc extends Bloc<PaymentEvent, PaymentState> {
  final Dio apiService;

  String? _currentPaymentMethodId;
  String? _currentPaymentIntentId;
  String? _currentClientSecret;
  bool _shouldSaveCard = false;

  PaymentBloc({required this.apiService}) : super(const PaymentInitial()) {
    on<LoadSavedPaymentMethods>(_onLoadSavedPaymentMethods);
    on<SelectSavedPaymentMethod>(_onSelectSavedPaymentMethod);
    on<SetDefaultPaymentMethod>(_onSetDefaultPaymentMethod);
    on<SelectNewCard>(_onSelectNewCard);
    on<SetSaveCardFlag>(_onSetSaveCardFlag);
    on<CreatePaymentIntent>(_onCreatePaymentIntent);
    on<ConfirmPayment>(_onConfirmPayment);
    on<SaveNewCard>(_onSaveNewCard);
    on<ResetPaymentState>(_onResetPaymentState);
  }

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
      print('$_logTag Loading saved payment methods');
      final response = await apiService.get(_paymentMethodsEndpoint);
      final list = (response.data['paymentMethods'] as List?) ?? [];
      final methods = list.map((pm) => _mapToPaymentMethod(pm as Map<String, dynamic>)).toList();
      print('$_logTag Loaded ${methods.length} payment methods');
      emit(PaymentMethodsLoaded(savedMethods: methods));
    } catch (e) {
      print('$_logTag Failed to load payment methods: $e');
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
      print('$_logTag Setting payment method ${event.paymentMethodId} as default');

      await apiService.patch(
        '$_paymentMethodsEndpoint/${event.paymentMethodId}/default',
      );

      print('$_logTag Reloading payment methods after default update');
      final response = await apiService.get(_paymentMethodsEndpoint);
      final list = (response.data['paymentMethods'] as List?) ?? [];
      final methods = list
          .whereType<Map<String, dynamic>>()
          .map(_mapToPaymentMethod)
          .toList();

      print('$_logTag Default payment method updated successfully');
      emit(PaymentMethodsLoaded(savedMethods: methods));
    } catch (e) {
      print('$_logTag Failed to set default payment method: $e');
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.failedToSetDefaultPaymentMethod,
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
      print('$_logTag No payment method selected');
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.paymentInitiationFailed,
        errorCode: 'no_payment_method',
      ));
      return;
    }

    emit(const CreatingPaymentIntent());
    try {
      print('$_logTag Creating payment intent: amount=${event.amountInCents}¢');

      final response = await apiService.post(_createIntentEndpoint, data: {
        'amountInCents': event.amountInCents,
        'stripePaymentMethodId': _currentPaymentMethodId,
      });

      final intentId = (response.data['paymentIntentId'] ?? '').toString();
      final secret = (response.data['clientSecret'] ?? '').toString();

      if (intentId.isEmpty || secret.isEmpty) {
        print('$_logTag Invalid response: missing intentId or secret');
        emit(const PaymentFailed(
          errorMessage: StripeErrorMessages.paymentInitiationFailed,
        ));
        return;
      }

      _currentPaymentIntentId = intentId;
      _currentClientSecret = secret;

      print('$_logTag Payment intent created: $intentId');
      emit(PaymentIntentCreated(
        clientSecret: secret,
        paymentIntentId: intentId,
      ));
    } catch (e) {
      print('$_logTag Error creating payment intent: $e');
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
      print('$_logTag Confirming payment');
      final result = await StripeService.confirmPayment(event.clientSecret);

      final error = result['error'];
      if (error != null) {
        final code = error.toString();
        final message = result['message']?.toString() ?? 'Unknown error';
        print('$_logTag Payment confirmation error: code=$code, message=$message');
        emit(PaymentFailed(
          errorMessage: StripeErrorMessages.getErrorMessage(code),
          errorCode: code,
        ));
        return;
      }

      final paymentIntentId = _currentPaymentIntentId ?? '';
      print('$_logTag Payment confirmed: $paymentIntentId');
      emit(PaymentSucceeded(paymentIntentId: paymentIntentId));
    } catch (e) {
      print('$_logTag Error confirming payment: $e');
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
      print('$_logTag Card save disabled by user');
      return;
    }

    emit(const SavingCard());
    try {
      print('$_logTag Saving new card: ${event.brand} ${event.last4}');

      await apiService.post(_paymentMethodsEndpoint, data: {
        'type': 'credit-card',
        'brand': event.brand,
        'last4': event.last4,
        'expiryMonth': event.expiryMonth.toString(),
        'expiryYear': event.expiryYear.toString(),
        'stripePaymentMethodId': event.paymentMethodId,
        'setAsDefault': false,
      });

      print('$_logTag Card saved successfully');
    } catch (e) {
      print('$_logTag Failed to save card: $e');
      emit(const CardSaveFailed(message: StripeErrorMessages.cardSaveFailed));
    }
  }

  void _onResetPaymentState(
    ResetPaymentState event,
    Emitter<PaymentState> emit,
  ) {
    _currentPaymentMethodId = null;
    _currentPaymentIntentId = null;
    _currentClientSecret = null;
    _shouldSaveCard = false;
    emit(const PaymentInitial());
  }
}
