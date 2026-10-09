import 'dart:developer' as developer;

import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/core/services/stripe_service.dart';

part 'payment_event.dart';
part 'payment_state.dart';

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
      _currentClientSecret = secret;

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

      final error = result['error'];
      if (error != null) {
        final code = error.toString();
        final message = result['message']?.toString() ?? 'Unknown error';
        developer.log('Payment confirmation error: code=$code, message=$message', name: 'PaymentBloc', level: 1000);
        emit(PaymentFailed(
          errorMessage: StripeErrorMessages.getErrorMessage(code),
          errorCode: code,
        ));
        return;
      }

      final paymentIntentId = _currentPaymentIntentId ?? '';
      developer.log('Payment confirmed: $paymentIntentId', name: 'PaymentBloc');
      emit(PaymentSucceeded(paymentIntentId: paymentIntentId));
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
