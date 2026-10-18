import 'package:bloc_test/bloc_test.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/core/services/seller_payment_result.dart';
import 'package:toko_mart/features/checkout/bloc/payment_bloc.dart';
import 'package:toko_mart/features/checkout/data/checkout_attempt_store.dart';
import 'package:toko_mart/features/checkout/data/checkout_session_api.dart';
import 'package:toko_mart/features/checkout/models/checkout_session_view.dart';

class MockDio extends Mock implements Dio {}

class MockCheckoutSessionApi extends Mock implements CheckoutSessionApi {}

/// Keeps attempts in memory, so tests can check what the bloc persists.
class InMemoryAttemptStore implements CheckoutAttemptStore {
  final Map<String, CheckoutAttempt> data = {};

  @override
  Future<CheckoutAttempt?> load(String buyerId) async => data[buyerId];

  @override
  Future<void> save(String buyerId, CheckoutAttempt attempt) async => data[buyerId] = attempt;

  @override
  Future<void> clear(String buyerId) async => data.remove(buyerId);
}

const _buyer = 'buyer-1';
const _payload = <String, dynamic>{'items': [], 'shippingAddress': {}, 'paymentMethod': {'type': 'credit-card'}};

CheckoutSellerView _seller(String id, {String? secret}) => CheckoutSellerView(
      sellerId: id,
      sellerName: 'Seller $id',
      amountMinor: 2500,
      currency: 'usd',
      status: 'awaiting_authorization',
      clientSecret: secret,
    );

CheckoutSellerView _authorizedSeller(String id) => _seller(id).copyWith(authorized: true);

CheckoutSessionView _session({String status = 'open', List<CheckoutSellerView>? sellers}) => CheckoutSessionView(
      id: 'sess-1',
      status: status,
      expiresAt: DateTime.utc(2026, 10, 14, 1),
      sellers: sellers ?? [_seller('s1', secret: 'pi_s1_secret'), _seller('s2', secret: 'pi_s2_secret')],
    );

const _held = SellerPaymentResult(outcome: SellerPaymentOutcome.requiresCapture);
const _notHeld = SellerPaymentResult(outcome: SellerPaymentOutcome.unknown);

void main() {
  setUpAll(() {
    registerFallbackValue(<String, dynamic>{});
  });

  late MockDio dio;
  late MockCheckoutSessionApi api;
  late InMemoryAttemptStore store;

  setUp(() {
    dio = MockDio();
    api = MockCheckoutSessionApi();
    store = InMemoryAttemptStore();
  });

  PaymentBloc build({
    SellerPaymentConfirmer? confirm,
    SellerPaymentReader? read,
    String Function()? newKey,
  }) {
    return PaymentBloc(
      apiService: dio,
      checkoutApi: api,
      attemptStore: store,
      confirmSellerPayment: confirm ?? (_, __) async => _held,
      readSellerPayment: read ?? (_) async => _notHeld,
      newIdempotencyKey: newKey ?? () => 'key-fixed-0001',
    );
  }

  void stubCreate({bool replayed = false}) {
    when(() => api.createSession(payload: any(named: 'payload'), idempotencyKey: any(named: 'idempotencyKey')))
        .thenAnswer((_) async => (session: _session(), replayed: replayed));
  }

  group('CreateCheckoutSession', () {
    blocTest<PaymentBloc, PaymentState>(
      'emits starting then the open session, and stores the attempt with its session ID',
      build: build,
      setUp: stubCreate,
      act: (b) => b.add(const CreateCheckoutSession(buyerId: _buyer, payload: _payload)),
      expect: () => [
        const CheckoutSessionStarting(),
        CheckoutSessionInProgress(session: _session()),
      ],
      verify: (_) {
        expect(store.data[_buyer]?.sessionId, 'sess-1');
        expect(store.data[_buyer]?.idempotencyKey, 'key-fixed-0001');
      },
    );

    blocTest<PaymentBloc, PaymentState>(
      'reuses the stored idempotency key when the attempt is retried after a restart',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001');
        stubCreate(replayed: true);
      },
      act: (b) => b.add(const CreateCheckoutSession(buyerId: _buyer, payload: _payload)),
      verify: (_) {
        verify(() => api.createSession(payload: _payload, idempotencyKey: 'key-stored-0001')).called(1);
      },
    );

    blocTest<PaymentBloc, PaymentState>(
      'idempotency_conflict ends the checkout and clears the attempt',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001');
        when(() => api.createSession(payload: any(named: 'payload'), idempotencyKey: any(named: 'idempotencyKey')))
            .thenThrow(const CheckoutApiException(code: 'idempotency_conflict', message: 'changed', statusCode: 409));
      },
      act: (b) => b.add(const CreateCheckoutSession(buyerId: _buyer, payload: _payload)),
      expect: () => [
        const CheckoutSessionStarting(),
        const CheckoutSessionEnded(
          message: 'Your cart or delivery details changed since you started checkout. Review your order and place it again.',
          errorCode: 'idempotency_conflict',
        ),
      ],
      verify: (_) => expect(store.data.containsKey(_buyer), isFalse),
    );

    blocTest<PaymentBloc, PaymentState>(
      'authorization_rejected ends the checkout and clears the attempt',
      build: build,
      setUp: () {
        when(() => api.createSession(payload: any(named: 'payload'), idempotencyKey: any(named: 'idempotencyKey')))
            .thenThrow(const CheckoutApiException(code: 'authorization_rejected', message: 'declined', statusCode: 402));
      },
      act: (b) => b.add(const CreateCheckoutSession(buyerId: _buyer, payload: _payload)),
      expect: () => [
        const CheckoutSessionStarting(),
        const CheckoutSessionEnded(
          message: 'Payment could not be authorized for a seller. Reserved items were released; review your cart and try again.',
          errorCode: 'authorization_rejected',
        ),
      ],
      verify: (_) => expect(store.data.containsKey(_buyer), isFalse),
    );

    blocTest<PaymentBloc, PaymentState>(
      'a validation failure shows the server message and keeps the attempt for a retry',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001');
        when(() => api.createSession(payload: any(named: 'payload'), idempotencyKey: any(named: 'idempotencyKey')))
            .thenThrow(const CheckoutApiException(code: 'insufficient_stock', message: 'Insufficient stock for: Book', statusCode: 409));
      },
      act: (b) => b.add(const CreateCheckoutSession(buyerId: _buyer, payload: _payload)),
      expect: () => [
        const CheckoutSessionStarting(),
        const PaymentFailed(errorMessage: 'Insufficient stock for: Book', errorCode: 'insufficient_stock'),
      ],
      verify: (_) => expect(store.data[_buyer]?.idempotencyKey, 'key-stored-0001'),
    );
  });

  group('ConfirmSellerAuthorization', () {
    blocTest<PaymentBloc, PaymentState>(
      'a seller already held in Stripe is marked authorized without confirming again',
      build: () => build(read: (_) async => _held),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test')),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), authorizingSellerId: 's1'),
        CheckoutSessionInProgress(
          session: _session(sellers: [_authorizedSeller('s1'), _seller('s2', secret: 'pi_s2_secret')]),
        ),
      ],
      verify: (_) => verifyNever(() => api.getSession(any())),
    );

    blocTest<PaymentBloc, PaymentState>(
      'a successful confirmation authorizes the seller and drops its client secret',
      build: () {
        final confirmed = <String>[];
        return build(confirm: (secret, paymentMethodId) async {
          confirmed.add('$secret|$paymentMethodId');
          return _held;
        });
      },
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test')),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), authorizingSellerId: 's1'),
        CheckoutSessionInProgress(
          session: _session(sellers: [_authorizedSeller('s1'), _seller('s2', secret: 'pi_s2_secret')]),
        ),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'a cancelled verification stops at this seller with the retry message and keeps the secret',
      build: () => build(confirm: (_, __) async => const SellerPaymentResult(
            outcome: SellerPaymentOutcome.canceledByUser,
            errorCode: 'payment_cancelled',
          )),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test')),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), authorizingSellerId: 's1'),
        CheckoutSessionInProgress(
          session: _session(),
          stopMessage: StripeErrorMessages.getErrorMessage('payment_cancelled'),
        ),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'a decline shows the bank message for this seller',
      build: () => build(confirm: (_, __) async => const SellerPaymentResult(
            outcome: SellerPaymentOutcome.failed,
            errorCode: 'Failed',
            message: 'Your card was declined.',
          )),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test')),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), authorizingSellerId: 's1'),
        CheckoutSessionInProgress(session: _session(), stopMessage: 'Your card was declined.'),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'an unknown outcome reads the session and Stripe, and authorizes when the hold exists',
      build: () {
        var reads = 0;
        return build(
          confirm: (_, __) async => _notHeld,
          // The first read (before confirming) finds no hold; the read that settles the outcome finds it.
          read: (_) async => reads++ == 0 ? _notHeld : _held,
        );
      },
      setUp: () => when(() => api.getSession(any())).thenAnswer((_) async => _session()),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test')),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), authorizingSellerId: 's1'),
        CheckoutSessionInProgress(
          session: _session(sellers: [_authorizedSeller('s1'), _seller('s2', secret: 'pi_s2_secret')]),
        ),
      ],
      verify: (_) => verify(() => api.getSession('sess-1')).called(1),
    );

    blocTest<PaymentBloc, PaymentState>(
      'an unknown outcome on a checkout that has since closed ends it and clears the attempt',
      build: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1');
        return build(confirm: (_, __) async => _notHeld, read: (_) async => _notHeld);
      },
      setUp: () {
        // First read (resume) sees an open session; the read that settles the outcome sees it expired.
        var reads = 0;
        when(() => api.getSession('sess-1')).thenAnswer(
          (_) async => reads++ == 0 ? _session() : _session(status: 'expired'),
        );
      },
      act: (b) async {
        b.add(const ResumeCheckoutSession(buyerId: _buyer));
        await b.stream.firstWhere((s) => s is CheckoutSessionInProgress);
        b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test'));
      },
      wait: const Duration(milliseconds: 50),
      expect: () => [
        const CheckoutSessionStarting(),
        CheckoutSessionInProgress(session: _session()),
        CheckoutSessionInProgress(session: _session(), authorizingSellerId: 's1'),
        const CheckoutSessionEnded(
          message: 'This checkout has ended. Review your cart and start again.',
          errorCode: 'session_expired',
        ),
      ],
      verify: (_) => expect(store.data.containsKey(_buyer), isFalse),
    );

    blocTest<PaymentBloc, PaymentState>(
      'an unknown outcome that is still not held asks the buyer to try again',
      build: () => build(confirm: (_, __) async => _notHeld, read: (_) async => _notHeld),
      setUp: () => when(() => api.getSession(any())).thenAnswer((_) async => _session()),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test')),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), authorizingSellerId: 's1'),
        CheckoutSessionInProgress(
          session: _session(),
          stopMessage: 'We could not confirm the payment for this seller. Your checkout is saved; try again to continue.',
        ),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'an unknown outcome that cannot be read from the server asks the buyer to try again',
      build: () => build(confirm: (_, __) async => _notHeld, read: (_) async => _notHeld),
      setUp: () => when(() => api.getSession(any()))
          .thenThrow(const CheckoutApiException(code: 'network_error', message: 'offline')),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test')),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), authorizingSellerId: 's1'),
        CheckoutSessionInProgress(
          session: _session(),
          stopMessage: 'We could not confirm the payment for this seller. Your checkout is saved; try again to continue.',
        ),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'an already authorized seller is not charged again',
      build: () => build(confirm: (_, __) async => fail('must not confirm an authorized seller')),
      seed: () => CheckoutSessionInProgress(
        session: _session(sellers: [_authorizedSeller('s1'), _seller('s2', secret: 'pi_s2_secret')]),
      ),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_test')),
      expect: () => <PaymentState>[],
    );

    blocTest<PaymentBloc, PaymentState>(
      'confirming without a card stops with a prompt and makes no Stripe call',
      build: () => build(confirm: (_, __) async => fail('must not confirm without a card')),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1')),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), stopMessage: 'Choose a payment method to continue.'),
      ],
    );

    final confirmCalls = <String>[];
    blocTest<PaymentBloc, PaymentState>(
      'the chosen card is passed to the confirmation for that seller',
      build: () => build(confirm: (secret, paymentMethodId) async {
        confirmCalls.add('$secret|$paymentMethodId');
        return _held;
      }),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ConfirmSellerAuthorization('s1', paymentMethodId: 'pm_card')),
      wait: const Duration(milliseconds: 50),
      verify: (_) => expect(confirmCalls, ['pi_s1_secret|pm_card']),
    );
  });

  group('FinalizeCheckoutSession', () {
    blocTest<PaymentBloc, PaymentState>(
      'refuses to place orders while a seller is still pending, and makes no API call',
      build: build,
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const FinalizeCheckoutSession()),
      expect: () => [
        CheckoutSessionInProgress(session: _session(), stopMessage: 'Payment is not finished for every seller yet. Complete the remaining payments to place your order.'),
      ],
      verify: (_) => verifyNever(() => api.confirmSession(any())),
    );

    blocTest<PaymentBloc, PaymentState>(
      'places the orders once every seller is held, and clears the attempt',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1');
        // Both sellers have no secret: the server lists them as already held.
        when(() => api.getSession('sess-1')).thenAnswer((_) async => _session(sellers: [_seller('s1'), _seller('s2')]));
        when(() => api.confirmSession('sess-1')).thenAnswer((_) async => ['o1', 'o2']);
      },
      act: (b) async {
        b.add(const ResumeCheckoutSession(buyerId: _buyer));
        await b.stream.firstWhere((s) => s is CheckoutSessionInProgress);
        b.add(const FinalizeCheckoutSession());
      },
      wait: const Duration(milliseconds: 50),
      expect: () => [
        const CheckoutSessionStarting(),
        CheckoutSessionInProgress(session: _session(sellers: [_authorizedSeller('s1'), _authorizedSeller('s2')])),
        CheckoutSessionInProgress(
          session: _session(sellers: [_authorizedSeller('s1'), _authorizedSeller('s2')]),
          isFinalizing: true,
        ),
        const CheckoutSessionPlaced(orderIds: ['o1', 'o2']),
      ],
      verify: (_) => expect(store.data.containsKey(_buyer), isFalse),
    );

    blocTest<PaymentBloc, PaymentState>(
      'authorization_not_ready keeps the session open and explains what is missing',
      build: build,
      setUp: () => when(() => api.confirmSession(any()))
          .thenThrow(const CheckoutApiException(code: 'authorization_not_ready', message: 'not ready', statusCode: 409)),
      seed: () => CheckoutSessionInProgress(
        session: _session(sellers: [_authorizedSeller('s1'), _authorizedSeller('s2')]),
      ),
      act: (b) => b.add(const FinalizeCheckoutSession()),
      expect: () => [
        CheckoutSessionInProgress(
          session: _session(sellers: [_authorizedSeller('s1'), _authorizedSeller('s2')]),
          isFinalizing: true,
        ),
        CheckoutSessionInProgress(
          session: _session(sellers: [_authorizedSeller('s1'), _authorizedSeller('s2')]),
          stopMessage: 'Payment is not finished for every seller yet. Complete the remaining payments to place your order.',
        ),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'a canceled authorization ends the checkout and clears the attempt',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1');
        when(() => api.getSession('sess-1')).thenAnswer((_) async => _session(sellers: [_seller('s1'), _seller('s2')]));
        when(() => api.confirmSession(any()))
            .thenThrow(const CheckoutApiException(code: 'authorization_canceled', message: 'canceled', statusCode: 409));
      },
      act: (b) async {
        b.add(const ResumeCheckoutSession(buyerId: _buyer));
        await b.stream.firstWhere((s) => s is CheckoutSessionInProgress);
        b.add(const FinalizeCheckoutSession());
      },
      wait: const Duration(milliseconds: 50),
      expect: () => [
        const CheckoutSessionStarting(),
        CheckoutSessionInProgress(session: _session(sellers: [_authorizedSeller('s1'), _authorizedSeller('s2')])),
        CheckoutSessionInProgress(
          session: _session(sellers: [_authorizedSeller('s1'), _authorizedSeller('s2')]),
          isFinalizing: true,
        ),
        const CheckoutSessionEnded(
          message: 'This checkout can no longer be completed. Its reserved items were released; review your cart and try again.',
          errorCode: 'authorization_canceled',
        ),
      ],
      verify: (_) => expect(store.data.containsKey(_buyer), isFalse),
    );
  });

  group('ResumeCheckoutSession', () {
    blocTest<PaymentBloc, PaymentState>(
      'with no stored attempt there is nothing to resume and no request is made',
      build: build,
      act: (b) => b.add(const ResumeCheckoutSession(buyerId: _buyer)),
      expect: () => [const PaymentInitial()],
      verify: (_) => verifyNever(() => api.getSession(any())),
    );

    blocTest<PaymentBloc, PaymentState>(
      'an open session resumes with sellers that have no secret shown as already held',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1');
        when(() => api.getSession('sess-1')).thenAnswer((_) async => _session(sellers: [
              _seller('s1'), // no secret: already held
              _seller('s2', secret: 'pi_s2_secret'),
            ]));
      },
      act: (b) => b.add(const ResumeCheckoutSession(buyerId: _buyer)),
      expect: () => [
        const CheckoutSessionStarting(),
        CheckoutSessionInProgress(session: _session(sellers: [_authorizedSeller('s1'), _seller('s2', secret: 'pi_s2_secret')])),
      ],
    );

    blocTest<PaymentBloc, PaymentState>(
      'an expired session ends the checkout and clears the attempt',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1');
        when(() => api.getSession('sess-1')).thenAnswer((_) async => _session(status: 'expired', sellers: []));
      },
      act: (b) => b.add(const ResumeCheckoutSession(buyerId: _buyer)),
      expect: () => [
        const CheckoutSessionStarting(),
        const CheckoutSessionEnded(
          message: 'This checkout has ended. Review your cart and start again.',
          errorCode: 'session_expired',
        ),
      ],
      verify: (_) => expect(store.data.containsKey(_buyer), isFalse),
    );

    blocTest<PaymentBloc, PaymentState>(
      'a session the server no longer knows clears the attempt and returns to the start',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1');
        when(() => api.getSession('sess-1'))
            .thenThrow(const CheckoutApiException(code: 'session_not_found', message: 'not found', statusCode: 404));
      },
      act: (b) => b.add(const ResumeCheckoutSession(buyerId: _buyer)),
      expect: () => [const CheckoutSessionStarting(), const PaymentInitial()],
      verify: (_) => expect(store.data.containsKey(_buyer), isFalse),
    );

    blocTest<PaymentBloc, PaymentState>(
      'a placed session resumes to its orders instead of assuming nothing was ordered',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1');
        when(() => api.getSession('sess-1')).thenAnswer((_) async => _session(status: 'placed', sellers: []));
        when(() => api.confirmSession('sess-1')).thenAnswer((_) async => ['o1']);
      },
      act: (b) => b.add(const ResumeCheckoutSession(buyerId: _buyer)),
      expect: () => [
        const CheckoutSessionStarting(),
        const CheckoutSessionPlaced(orderIds: ['o1']),
      ],
      verify: (_) => expect(store.data.containsKey(_buyer), isFalse),
    );

    blocTest<PaymentBloc, PaymentState>(
      'a network failure keeps the attempt so the checkout can be resumed later',
      build: build,
      setUp: () {
        store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1');
        when(() => api.getSession('sess-1'))
            .thenThrow(const CheckoutApiException(code: 'network_error', message: 'offline'));
      },
      act: (b) => b.add(const ResumeCheckoutSession(buyerId: _buyer)),
      expect: () => [
        const CheckoutSessionStarting(),
        const PaymentFailed(errorMessage: 'We could not reach your checkout. Try again.', errorCode: 'network_error'),
      ],
      verify: (_) => expect(store.data[_buyer]?.sessionId, 'sess-1'),
    );
  });

  group('ResetPaymentState', () {
    blocTest<PaymentBloc, PaymentState>(
      'leaving the screen does not clear the stored attempt',
      build: build,
      setUp: () => store.data[_buyer] = const CheckoutAttempt(idempotencyKey: 'key-stored-0001', sessionId: 'sess-1'),
      seed: () => CheckoutSessionInProgress(session: _session()),
      act: (b) => b.add(const ResetPaymentState()),
      expect: () => [const PaymentInitial()],
      verify: (_) => expect(store.data[_buyer]?.sessionId, 'sess-1'),
    );
  });
}
