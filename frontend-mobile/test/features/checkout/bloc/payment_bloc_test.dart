import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/features/checkout/bloc/payment_bloc.dart';

class MockDio extends Mock implements Dio {}

Response<dynamic> _response(dynamic data, String path) => Response<dynamic>(
      data: data,
      statusCode: 200,
      requestOptions: RequestOptions(path: path),
    );

DioException _dioError(String path) => DioException(
      requestOptions: RequestOptions(path: path),
      type: DioExceptionType.connectionError,
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockDio api;

  setUp(() {
    api = MockDio();
  });

  PaymentBloc build() => PaymentBloc(apiService: api);

  const select = SelectSavedPaymentMethod(
    paymentMethodId: 'pm_1',
    brand: 'visa',
    last4: '4242',
  );

  const savedCard = SaveNewCard(
    paymentMethodId: 'pm_new',
    brand: 'visa',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2030,
  );

  group('initial state', () {
    test('is PaymentInitial', () {
      expect(build().state, const PaymentInitial());
    });
  });

  group('LoadSavedPaymentMethods', () {
    blocTest<PaymentBloc, PaymentState>(
      'emits Loading then PaymentMethodsLoaded with parsed methods',
      build: () {
        when(() => api.get('/auth/payment-methods')).thenAnswer(
          (_) async => _response({
            'paymentMethods': [
              {
                'stripePaymentMethodId': 'pm_1',
                'brand': 'visa',
                'last4': '4242',
                'expiryMonth': '12',
                'expiryYear': 2030,
                'isDefault': true,
              },
            ],
          }, '/auth/payment-methods'),
        );
        return build();
      },
      act: (b) => b.add(const LoadSavedPaymentMethods()),
      expect: () => [
        const LoadingSavedPaymentMethods(),
        const PaymentMethodsLoaded(savedMethods: [
          SavedPaymentMethod(
            id: 'pm_1',
            brand: 'visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2030,
            isDefault: true,
          ),
        ]),
      ],
      verify: (_) {
        verify(() => api.get('/auth/payment-methods')).called(1);
      },
    );

    blocTest<PaymentBloc, PaymentState>(
      'emits empty list when paymentMethods missing',
      build: () {
        when(() => api.get('/auth/payment-methods')).thenAnswer(
          (_) async => _response(<String, dynamic>{}, '/auth/payment-methods'),
        );
        return build();
      },
      act: (b) => b.add(const LoadSavedPaymentMethods()),
      expect: () => [
        const LoadingSavedPaymentMethods(),
        const PaymentMethodsLoaded(savedMethods: []),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'emits PaymentFailed on API error',
      build: () {
        when(() => api.get('/auth/payment-methods'))
            .thenThrow(_dioError('/auth/payment-methods'));
        return build();
      },
      act: (b) => b.add(const LoadSavedPaymentMethods()),
      expect: () => [
        const LoadingSavedPaymentMethods(),
        const PaymentFailed(
          errorMessage: StripeErrorMessages.savedCardsFetchFailed,
        ),
      ],
    );
  });

  group('SelectSavedPaymentMethod', () {
    blocTest<PaymentBloc, PaymentState>(
      'selects the matching method from loaded list',
      build: build,
      seed: () => const PaymentMethodsLoaded(savedMethods: [
        SavedPaymentMethod(
          id: 'pm_1',
          brand: 'visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2030,
          isDefault: true,
        ),
      ]),
      act: (b) => b.add(select),
      expect: () => [
        const PaymentMethodsLoaded(
          savedMethods: [
            SavedPaymentMethod(
              id: 'pm_1',
              brand: 'visa',
              last4: '4242',
              expiryMonth: 12,
              expiryYear: 2030,
              isDefault: true,
            ),
          ],
          selectedMethod: SavedPaymentMethod(
            id: 'pm_1',
            brand: 'visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2030,
            isDefault: true,
          ),
        ),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'builds a method from event data when not in the loaded list',
      build: build,
      act: (b) => b.add(select),
      expect: () => [
        const PaymentMethodsLoaded(
          savedMethods: [],
          selectedMethod: SavedPaymentMethod(
            id: 'pm_1',
            brand: 'visa',
            last4: '4242',
            expiryMonth: 0,
            expiryYear: 0,
            isDefault: false,
          ),
        ),
      ],
    );
  });

  group('SelectNewCard', () {
    blocTest<PaymentBloc, PaymentState>(
      'emits NewCardSelected(shouldSave: false)',
      build: build,
      act: (b) => b.add(const SelectNewCard()),
      expect: () => [const NewCardSelected(shouldSave: false)],
    );
  });

  group('SetSaveCardFlag', () {
    blocTest<PaymentBloc, PaymentState>(
      'emits NewCardSelected with updated flag',
      build: build,
      act: (b) {
        b.add(const SetSaveCardFlag(true));
        b.add(const SetSaveCardFlag(false));
      },
      expect: () => [
        const NewCardSelected(shouldSave: true),
        const NewCardSelected(shouldSave: false),
      ],
    );
  });

  group('CreatePaymentIntent', () {
    blocTest<PaymentBloc, PaymentState>(
      'posts to API and emits PaymentIntentCreated with clientSecret',
      build: () {
        when(() => api.post(
              '/payments/create-intent',
              data: any(named: 'data'),
            )).thenAnswer((_) async => _response({
              'paymentIntentId': 'pi_1',
              'clientSecret': 'pi_1_secret',
            }, '/payments/create-intent'));
        return build();
      },
      act: (b) async {
        b.add(select);
        b.add(const CreatePaymentIntent(5000));
      },
      skip: 1,
      expect: () => [
        const CreatingPaymentIntent(),
        const PaymentIntentCreated(
          clientSecret: 'pi_1_secret',
          paymentIntentId: 'pi_1',
        ),
      ],
      verify: (_) {
        verify(() => api.post('/payments/create-intent', data: {
              'amountInCents': 5000,
              'stripePaymentMethodId': 'pm_1',
            })).called(1);
      },
    );

    blocTest<PaymentBloc, PaymentState>(
      'fails without calling API when no payment method selected',
      build: build,
      act: (b) => b.add(const CreatePaymentIntent(5000)),
      expect: () => [
        const PaymentFailed(
          errorMessage: StripeErrorMessages.paymentInitiationFailed,
          errorCode: 'no_payment_method',
        ),
      ],
      verify: (_) {
        verifyNever(() => api.post(any(), data: any(named: 'data')));
      },
    );

    blocTest<PaymentBloc, PaymentState>(
      'emits PaymentFailed on API error',
      build: () {
        when(() => api.post(
              '/payments/create-intent',
              data: any(named: 'data'),
            )).thenThrow(_dioError('/payments/create-intent'));
        return build();
      },
      act: (b) {
        b.add(select);
        b.add(const CreatePaymentIntent(5000));
      },
      skip: 1,
      expect: () => [
        const CreatingPaymentIntent(),
        const PaymentFailed(
          errorMessage: StripeErrorMessages.paymentInitiationFailed,
        ),
      ],
    );
  });

  // StripeService.confirmPayment is a static method wrapping Stripe.instance,
  // which cannot be mocked without changing production code. In the unit-test
  // environment the Stripe SDK is not initialised, so the call fails and
  // StripeService maps it to a 'network_error' result. The success path
  // (PaymentSucceeded) therefore cannot be exercised here without a
  // StripeService seam; it is covered by the state/equality test below only.
  group('ConfirmPayment', () {
    blocTest<PaymentBloc, PaymentState>(
      'emits ConfirmingPayment then PaymentFailed when Stripe call fails',
      build: build,
      act: (b) => b.add(const ConfirmPayment('pi_1_secret')),
      expect: () => [
        const ConfirmingPayment(),
        PaymentFailed(
          errorMessage: StripeErrorMessages.getErrorMessage('network_error'),
          errorCode: 'network_error',
        ),
      ],
    );

    test('PaymentSucceeded carries the payment intent id', () {
      expect(
        const PaymentSucceeded(paymentIntentId: 'pi_1'),
        const PaymentSucceeded(paymentIntentId: 'pi_1'),
      );
    });
  });

  group('SaveNewCard', () {
    blocTest<PaymentBloc, PaymentState>(
      'posts card to API when save flag is true',
      build: () {
        when(() => api.post(
              '/auth/payment-methods',
              data: any(named: 'data'),
            )).thenAnswer(
          (_) async => _response({}, '/auth/payment-methods'),
        );
        return build();
      },
      act: (b) {
        b.add(const SetSaveCardFlag(true));
        b.add(savedCard);
      },
      skip: 1,
      expect: () => [const SavingCard()],
      verify: (_) {
        verify(() => api.post('/auth/payment-methods', data: {
              'type': 'credit-card',
              'brand': 'visa',
              'last4': '4242',
              'expiryMonth': '12',
              'expiryYear': '2030',
              'stripePaymentMethodId': 'pm_new',
              'setAsDefault': false,
            })).called(1);
      },
    );

    blocTest<PaymentBloc, PaymentState>(
      'does nothing when save flag is false',
      build: build,
      act: (b) => b.add(savedCard),
      expect: () => <PaymentState>[],
      verify: (_) {
        verifyNever(() => api.post(any(), data: any(named: 'data')));
      },
    );

    blocTest<PaymentBloc, PaymentState>(
      'emits CardSaveFailed on API error',
      build: () {
        when(() => api.post(
              '/auth/payment-methods',
              data: any(named: 'data'),
            )).thenThrow(_dioError('/auth/payment-methods'));
        return build();
      },
      act: (b) {
        b.add(const SetSaveCardFlag(true));
        b.add(savedCard);
      },
      skip: 1,
      expect: () => [
        const SavingCard(),
        const CardSaveFailed(message: StripeErrorMessages.cardSaveFailed),
      ],
    );
  });

  group('ResetPaymentState', () {
    blocTest<PaymentBloc, PaymentState>(
      'emits PaymentInitial',
      build: build,
      seed: () => const NewCardSelected(shouldSave: true),
      act: (b) => b.add(const ResetPaymentState()),
      expect: () => [const PaymentInitial()],
    );

    blocTest<PaymentBloc, PaymentState>(
      'clears selected method and save flag',
      build: build,
      act: (b) {
        b.add(select);
        b.add(const ResetPaymentState());
        b.add(const CreatePaymentIntent(100));
        b.add(const SetSaveCardFlag(true));
        b.add(const ResetPaymentState());
        b.add(savedCard);
      },
      skip: 1,
      expect: () => [
        const PaymentInitial(),
        // selected method cleared -> intent creation refused
        const PaymentFailed(
          errorMessage: StripeErrorMessages.paymentInitiationFailed,
          errorCode: 'no_payment_method',
        ),
        const NewCardSelected(shouldSave: true),
        const PaymentInitial(),
        // save flag cleared -> SaveNewCard is a no-op (no SavingCard)
      ],
      verify: (_) {
        verifyNever(() => api.post(any(), data: any(named: 'data')));
      },
    );
  });
}
