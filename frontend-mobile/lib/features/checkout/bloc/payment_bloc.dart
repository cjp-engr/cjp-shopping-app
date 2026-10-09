import 'package:dio/dio.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/core/services/stripe_service.dart';

part 'payment_event.dart';
part 'payment_state.dart';

/// Note: the brief referenced an `ApiService` that does not exist in this
/// codebase. The HTTP layer is a Dio instance from `ApiClient` (auth token is
/// added by its interceptor), so a Dio is injected instead.
class PaymentBloc extends Bloc<PaymentEvent, PaymentState> {
  final Dio apiService;

  String? _currentPaymentMethodId;
  String? _currentPaymentIntentId;
  // ignore: unused_field
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

  Future<void> _onLoadSavedPaymentMethods(
    LoadSavedPaymentMethods event,
    Emitter<PaymentState> emit,
  ) async {
    emit(const LoadingSavedPaymentMethods());
    try {
      final response = await apiService.get('/auth/payment-methods');
      final list = (response.data['paymentMethods'] as List?) ?? [];
      final methods = list.map((pm) {
        final m = pm as Map<String, dynamic>;
        return SavedPaymentMethod(
          id: (m['_id'] ?? m['id'] ?? '').toString(),
          brand: (m['brand'] ?? '').toString(),
          last4: (m['last4'] ?? '').toString(),
          expiryMonth: int.tryParse('${m['expiryMonth'] ?? ''}') ?? 0,
          expiryYear: int.tryParse('${m['expiryYear'] ?? ''}') ?? 0,
          isDefault: m['isDefault'] == true,
          stripePaymentMethodId: m['stripePaymentMethodId']?.toString(),
        );
      }).toList();
      emit(PaymentMethodsLoaded(savedMethods: methods));
    } catch (_) {
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
    final current = state;
    final existing = current is PaymentMethodsLoaded
        ? current.savedMethods
        : <SavedPaymentMethod>[];
    SavedPaymentMethod? selected;
    for (final m in existing) {
      if (m.id == event.paymentMethodId) selected = m;
    }
    selected ??= SavedPaymentMethod(
      id: event.paymentMethodId,
      brand: event.brand,
      last4: event.last4,
      expiryMonth: 0,
      expiryYear: 0,
      isDefault: false,
    );
    emit(PaymentMethodsLoaded(
      savedMethods: existing,
      selectedMethod: selected,
    ));
  }

  Future<void> _onSetDefaultPaymentMethod(
    SetDefaultPaymentMethod event,
    Emitter<PaymentState> emit,
  ) async {
    try {
      await apiService.patch(
        '/auth/payment-methods/${event.paymentMethodId}/default',
      );
      // Reload saved payment methods to refresh the default status
      final response = await apiService.get('/auth/payment-methods');
      final list = (response.data['paymentMethods'] as List?) ?? [];
      final methods = list
          .whereType<Map<String, dynamic>>()
          .map((m) => SavedPaymentMethod(
                id: m['_id'] as String? ?? '',
                brand: m['brand'] as String? ?? '',
                last4: m['last4'] as String? ?? '',
                expiryMonth: (m['expiryMonth'] as num?)?.toInt() ?? 0,
                expiryYear: (m['expiryYear'] as num?)?.toInt() ?? 0,
                isDefault: m['isDefault'] as bool? ?? false,
                stripePaymentMethodId: m['stripePaymentMethodId'] as String?,
              ))
          .toList();
      emit(PaymentMethodsLoaded(savedMethods: methods));
    } catch (e) {
      emit(const PaymentFailed(
          errorMessage: 'Failed to set default payment method'));
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
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.paymentInitiationFailed,
        errorCode: 'no_payment_method',
      ));
      return;
    }
    emit(const CreatingPaymentIntent());
    try {
      // ignore: avoid_print
      print(
          'CreatePaymentIntent request: amountInCents=${event.amountInCents}, paymentMethodId=$_currentPaymentMethodId');
      final response = await apiService.post('/payments/create-intent', data: {
        'amountInCents': event.amountInCents,
        'stripePaymentMethodId': _currentPaymentMethodId,
      });
      // ignore: avoid_print
      print('CreatePaymentIntent response: ${response.data}');
      final intentId = (response.data['paymentIntentId'] ?? '').toString();
      final secret = (response.data['clientSecret'] ?? '').toString();
      if (intentId.isEmpty || secret.isEmpty) {
        // ignore: avoid_print
        print('ERROR: Missing paymentIntentId or clientSecret in response');
        emit(const PaymentFailed(
          errorMessage: StripeErrorMessages.paymentInitiationFailed,
        ));
        return;
      }
      _currentPaymentIntentId = intentId;
      _currentClientSecret = secret;
      emit(PaymentIntentCreated(
        clientSecret: secret,
        paymentIntentId: intentId,
      ));
    } catch (e) {
      // ignore: avoid_print
      print('ERROR creating payment intent: $e');
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
      // ignore: avoid_print
      print('Confirming payment with clientSecret: ${event.clientSecret}');
      // StripeService.confirmPayment is static in this codebase.
      final result = await StripeService.confirmPayment(event.clientSecret);
      // ignore: avoid_print
      print('ConfirmPayment result: $result');
      final error = result['error'];
      if (error != null) {
        final code = error.toString();
        final message = result['message']?.toString() ?? '';
        // ignore: avoid_print
        print('ConfirmPayment error: code=$code, message=$message');
        emit(PaymentFailed(
          errorMessage: StripeErrorMessages.getErrorMessage(code),
          errorCode: code,
        ));
      } else {
        emit(PaymentSucceeded(paymentIntentId: _currentPaymentIntentId ?? ''));
      }
    } catch (e) {
      // ignore: avoid_print
      print('ERROR confirming payment: $e');
      emit(const PaymentFailed(
        errorMessage: StripeErrorMessages.paymentConfirmationFailed,
      ));
    }
  }

  Future<void> _onSaveNewCard(
    SaveNewCard event,
    Emitter<PaymentState> emit,
  ) async {
    if (!_shouldSaveCard) return;
    emit(const SavingCard());
    try {
      await apiService.post('/auth/payment-methods', data: {
        'type': 'credit-card',
        'brand': event.brand,
        'last4': event.last4,
        'expiryMonth': event.expiryMonth.toString(),
        'expiryYear': event.expiryYear.toString(),
        'stripePaymentMethodId': event.paymentMethodId,
        'setAsDefault': false,
      });
    } catch (_) {
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
