// Integration tests for the full checkout payment flow.
//
// These run as flutter_test widget tests (no device needed) and exercise the
// real widgets and blocs together: PaymentScreen + PaymentBloc, with Navigator
// routing between them.
//
// Only the outer boundaries are faked:
//  * HTTP layer        -> mocktail Dio (checkout sessions, payment methods)
//  * Stripe native SDK -> _FakeStripePlatform (createPaymentMethod /
//                         confirmPayment / retrievePaymentIntent) plus a mocked
//                         platform-view channel so CardFormField can be built.
//  * Local storage     -> SharedPreferences mock (the stored checkout attempt).
//
// Two groups:
//  * session flow (CHECKOUT_FLOW=manual_capture): the server holds each seller's
//    payment, then places the orders. These run.
//  * legacy flow (one-step charge): kept, still skipped until the legacy path is
//    removed in phase 4.
import 'package:dio/dio.dart';
import 'package:flutter/material.dart' hide Card;
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
// ignore: depend_on_referenced_packages
import 'package:plugin_platform_interface/plugin_platform_interface.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/features/checkout/bloc/checkout_bloc.dart';
import 'package:toko_mart/features/checkout/bloc/payment_bloc.dart';
import 'package:toko_mart/features/checkout/screens/order_confirmation_screen.dart';
import 'package:toko_mart/features/checkout/screens/payment_screen.dart';
import 'package:toko_mart/features/checkout/utils/checkout_session_payload.dart';
import 'package:toko_mart/features/orders/domain/entities/order_entity.dart';
import 'package:toko_mart/features/orders/domain/repositories/order_repository.dart';

// -- Fakes / mocks ------------------------------------------------------------

class _MockDio extends Mock implements Dio {}

class _MockOrderRepository extends Mock implements OrderRepository {}

class _FakePaymentIntent extends Fake implements PaymentIntent {
  _FakePaymentIntent([this.status = PaymentIntentsStatus.Succeeded]);

  @override
  final PaymentIntentsStatus status;
}

class _FakePaymentMethod extends Fake implements PaymentMethod {
  @override
  String get id => 'pm_new_card';

  @override
  Card get card =>
      const Card(brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2030);
}

/// Stand-in for the native Stripe SDK. Behaviour is swapped per test.
class _FakeStripePlatform extends Fake
    with MockPlatformInterfaceMixin
    implements StripePlatform {
  /// Called for every confirmPayment; throw a StripeException to fail.
  Future<PaymentIntent> Function() onConfirm = () async => _FakePaymentIntent();

  int confirmCalls = 0;
  int createPaymentMethodCalls = 0;

  /// Secrets and card IDs in the order the bloc confirmed them.
  final List<String> confirmedSecrets = [];
  final List<String?> confirmedMethodIds = [];

  /// Intents Stripe has placed a hold on (confirmed with status requires_capture).
  final Set<String> held = {};

  @override
  bool get updateSettingsLazily => true;

  @override
  Future<void> initialise({
    required String publishableKey,
    String? stripeAccountId,
    ThreeDSecureConfigurationParams? threeDSecureParams,
    String? merchantIdentifier,
    String? urlScheme,
    bool? setReturnUrlSchemeOnAndroid,
  }) async {}

  @override
  Future<PaymentMethod> createPaymentMethod(
    PaymentMethodParams data, [
    PaymentMethodOptions? options,
  ]) async {
    createPaymentMethodCalls++;
    return _FakePaymentMethod();
  }

  @override
  Future<PaymentIntent> confirmPayment(
    String paymentIntentClientSecret,
    PaymentMethodParams? params,
    PaymentMethodOptions? options,
  ) async {
    confirmCalls++;
    confirmedSecrets.add(paymentIntentClientSecret);
    confirmedMethodIds.add(
      params?.maybeWhen(
        cardFromMethodId: (data) => data.paymentMethodId,
        orElse: () => null,
      ),
    );
    final intent = await onConfirm();
    if (intent.status == PaymentIntentsStatus.RequiresCapture) {
      held.add(paymentIntentClientSecret);
    }
    return intent;
  }

  @override
  Future<PaymentIntent> retrievePaymentIntent(String clientSecret) async =>
      _FakePaymentIntent(held.contains(clientSecret)
          ? PaymentIntentsStatus.RequiresCapture
          : PaymentIntentsStatus.RequiresPaymentMethod);
}

// -- Test data ----------------------------------------------------------------

const _intentId = 'pi_test_123';
const _clientSecret = 'pi_test_123_secret_abc';
const _amountInCents = 5000;
const _sessionId = 'sess-1';

Future<PaymentIntent> Function() _holdAll =
    () async => _FakePaymentIntent(PaymentIntentsStatus.RequiresCapture);

Map<String, dynamic> _orderData() => {
      'userId': 'buyer-1',
      'items': [
        {'productId': 'p1', 'quantity': 1},
      ],
      'shippingAddress': {
        'street': '123 Test Street',
        'city': 'Manila',
        'state': 'Metro Manila',
        'zipCode': '1000',
        'country': 'PH',
      },
      'paymentMethod': {'type': 'credit-card'},
      'sellerMessages': <String, String>{},
      'couponCodes': <String, String>{},
      'deliverySelections': <String, String>{},
      'contactEmail': 'buyer@example.com',
      'subtotal': 50.0,
      'tax': 4.0,
      'shipping': 0.0,
      'total': 54.0,
    };

Map<String, dynamic> _seller(String id, {String? secret, String status = 'awaiting_authorization'}) => {
      'sellerId': id,
      'sellerName': 'Seller $id',
      'draftOrderId': 'draft-$id',
      'amountMinor': 2500,
      'currency': 'usd',
      'status': status,
      if (secret != null) 'clientSecret': secret,
    };

Map<String, dynamic> _session({
  String status = 'open',
  required List<Map<String, dynamic>> sellers,
}) =>
    {
      'id': _sessionId,
      'status': status,
      'expiresAt': '2026-10-14T00:15:00.000Z',
      'sellers': sellers,
    };

OrderEntity _order() => const OrderEntity(
      id: 'ord12345abcdef',
      userId: 'user-1',
      items: [
        OrderItemEntity(
          productId: 'p1',
          productName: 'Test Sneakers',
          productImage: '',
          price: 50,
          quantity: 1,
        ),
      ],
      shippingAddress: OrderAddressEntity(
        street: '123 Test Street',
        city: 'Manila',
        state: 'Metro Manila',
        zipCode: '1000',
        country: 'PH',
      ),
      paymentType: 'credit-card',
      subtotal: 50,
      productDiscount: 0,
      discount: 0,
      tax: 0,
      shipping: 0,
      total: 50,
      status: 'pending',
      createdAt: '2026-10-04T00:00:00Z',
    );

Response<dynamic> _respond(Object body, {int status = 200}) => Response<dynamic>(
      requestOptions: RequestOptions(path: ''),
      statusCode: status,
      data: body,
    );

Map<String, dynamic> _envelope(Map<String, dynamic> data) => {'success': true, 'data': data};

/// A placed checkout: the orders sit inside `data`, where CheckoutSessionApi reads them.
Map<String, dynamic> _placedEnvelope(List<Map<String, dynamic>> orders) =>
    _envelope({..._session(status: 'placed', sellers: []), 'orders': orders});

DioException _apiError(int status, Map<String, dynamic> body) => DioException(
      requestOptions: RequestOptions(path: ''),
      type: DioExceptionType.badResponse,
      response: Response<dynamic>(
        requestOptions: RequestOptions(path: ''),
        statusCode: status,
        data: body,
      ),
    );

Map<String, dynamic> _structuredError(String code, String message, {bool retryable = false}) => {
      'success': false,
      'error': {'code': code, 'message': message, 'retryable': retryable},
    };

StripeException _stripeError(FailureCode code, {String message = 'stripe says no'}) => StripeException(
      error: LocalizedErrorMessage(code: code, message: message),
    );

// -- Harness: session flow ----------------------------------------------------

/// Checkout page -> PaymentScreen (session mode). The order is "placed" when the
/// session completes; the harness then shows the placed order IDs.
class _SessionHarness extends StatefulWidget {
  final Dio dio;
  final String buyerId;

  const _SessionHarness({required this.dio, required this.buyerId});

  @override
  State<_SessionHarness> createState() => _SessionHarnessState();
}

class _SessionHarnessState extends State<_SessionHarness> {
  List<String>? _placedOrderIds;

  void _openPayment(BuildContext context) {
    Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (routeCtx) => BlocProvider<PaymentBloc>(
          create: (_) => PaymentBloc(apiService: widget.dio),
          child: PaymentScreen(
            amountInCents: _amountInCents,
            cartItems: const ['item-1'],
            onBack: () => Navigator.of(routeCtx).pop(),
            onPaymentSuccess: (_, __) {},
            checkoutPayload: checkoutSessionPayload(_orderData(), paymentType: 'credit-card'),
            buyerId: widget.buyerId,
            onCheckoutPlaced: (orderIds) {
              setState(() => _placedOrderIds = orderIds);
              Navigator.of(routeCtx).pop();
            },
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final placed = _placedOrderIds;
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ElevatedButton(
              onPressed: () => _openPayment(context),
              child: const Text('Continue to Payment'),
            ),
            if (placed != null) Text('Orders placed: ${placed.join(', ')}'),
          ],
        ),
      ),
    );
  }
}

// -- Harness: legacy flow (kept, skipped until phase 4) -----------------------

/// Checkout page -> PaymentScreen (legacy) -> OrderConfirmationScreen.
class _CheckoutHarness extends StatefulWidget {
  final Dio dio;
  final CheckoutBloc checkoutBloc;

  const _CheckoutHarness({required this.dio, required this.checkoutBloc});

  @override
  State<_CheckoutHarness> createState() => _CheckoutHarnessState();
}

class _CheckoutHarnessState extends State<_CheckoutHarness> {
  String? _pendingIntentId;
  String? _cardBrand;
  String? _cardLast4;

  void _openPayment(BuildContext context) {
    _pendingIntentId = null;
    Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (routeCtx) => BlocProvider<PaymentBloc>(
          create: (_) => PaymentBloc(apiService: widget.dio),
          child: BlocListener<PaymentBloc, PaymentState>(
            listener: (_, state) {
              if (state is PaymentMethodsLoaded &&
                  state.selectedMethod != null) {
                _cardBrand = state.selectedMethod!.brand;
                _cardLast4 = state.selectedMethod!.last4;
              }
            },
            child: PaymentScreen(
              amountInCents: _amountInCents,
              cartItems: const ['item-1'],
              onBack: () => Navigator.of(routeCtx).pop(),
              onPaymentSuccess: (paymentIntentId, _) {
                _pendingIntentId = paymentIntentId;
                widget.checkoutBloc.add(CheckoutPaymentSucceeded(
                  paymentIntentId,
                  orderData: const {'total': 50.0},
                ));
              },
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<CheckoutBloc, CheckoutState>(
      bloc: widget.checkoutBloc,
      listener: (context, state) {
        if (state is OrderCreated && _pendingIntentId != null) {
          final intentId = _pendingIntentId!;
          _pendingIntentId = null;
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => OrderConfirmationScreen(
                paymentIntentId: intentId,
                order: state.order,
                cardBrand: _cardBrand,
                cardLast4: _cardLast4,
                onContinueShopping: () =>
                    Navigator.of(context).popUntil((r) => r.isFirst),
              ),
            ),
          );
        } else if (state is OrderCreationFailed && _pendingIntentId != null) {
          _pendingIntentId = null;
          Navigator.of(context).pop(); // PaymentScreen is on top
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
              'Payment succeeded but the order could not be created: '
              '${state.errorMessage}. Please contact support.',
            ),
            backgroundColor: Colors.red,
          ));
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: Center(
          child: ElevatedButton(
            onPressed: () => _openPayment(context),
            child: const Text('Continue to Payment'),
          ),
        ),
      ),
    );
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late _FakeStripePlatform stripe;
  late _MockDio dio;
  late _MockOrderRepository orders;
  late CheckoutBloc checkoutBloc;

  // Platform-view bookkeeping for CardFormField.
  int? cardViewId;

  setUpAll(() {
    // Must happen before the first access of Stripe.instance.
    stripe = _FakeStripePlatform();
    StripePlatform.instance = stripe;
    Stripe.publishableKey = 'pk_test_dummy';
    registerFallbackValue(<String, dynamic>{});
  });

  setUp(() {
    // Stripe caches its settings Future; one created inside a previous test's
    // FakeAsync zone would never resolve in this one, so force a fresh one.
    Stripe.instance.markNeedsSettings();
    SharedPreferences.setMockInitialValues({});
    stripe
      ..onConfirm = (() async => _FakePaymentIntent())
      ..confirmCalls = 0
      ..createPaymentMethodCalls = 0
      ..confirmedSecrets.clear()
      ..confirmedMethodIds.clear()
      ..held.clear();

    dio = _MockDio();
    when(() => dio.get('/auth/payment-methods')).thenAnswer(
      (_) async => _respond({
        'paymentMethods': [
          {
            'stripePaymentMethodId': 'pm_saved_1',
            'brand': 'visa',
            'last4': '4242',
            'expiryMonth': 12,
            'expiryYear': 2030,
            'isDefault': true,
          },
          {
            'stripePaymentMethodId': 'pm_saved_2',
            'brand': 'mastercard',
            'last4': '5555',
            'expiryMonth': 1,
            'expiryYear': 2031,
            'isDefault': false,
          },
        ],
      }),
    );
    when(() => dio.post('/payments/create-intent', data: any(named: 'data')))
        .thenAnswer(
      (_) async => _respond({
        'paymentIntentId': _intentId,
        'clientSecret': _clientSecret,
      }),
    );
    when(() => dio.post('/auth/payment-methods', data: any(named: 'data')))
        .thenAnswer((_) async => _respond({}));

    orders = _MockOrderRepository();
    when(() => orders.createOrder(any())).thenAnswer((_) async => [_order()]);

    // Mock the platform-view channel so CardFormField can be built.
    cardViewId = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform_views, (call) async {
      final args = call.arguments;
      switch (call.method) {
        case 'create':
          cardViewId = (args as Map)['id'] as int;
          return 0; // texture id
        case 'resize':
          final size = (args as Map)['size'] as Map?;
          return <String, Object?>{
            'width': size?['width'] ?? 0.0,
            'height': size?['height'] ?? 0.0,
          };
        default:
          return null;
      }
    });
  });

  tearDown(() async {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform_views, null);
  });

  // -- helpers ----------------------------------------------------------------

  Future<void> pumpSession(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
      home: _SessionHarness(dio: dio, buyerId: 'buyer-1'),
    ));
    await tester.pumpAndSettle();
  }

  /// Stubs the create call: each entry answers one call in order (the last repeats).
  void stubCreate(List<Object> answers) {
    var call = 0;
    when(() => dio.post<dynamic>(
          '/checkout/sessions',
          data: any(named: 'data'),
          options: any(named: 'options'),
        )).thenAnswer((_) async {
      final answer = answers[call < answers.length ? call : answers.length - 1];
      call++;
      if (answer is DioException) throw answer;
      return answer as Response<dynamic>;
    });
  }

  void stubConfirmSession(Object answer) {
    when(() => dio.post<dynamic>('/checkout/sessions/$_sessionId/confirm'))
        .thenAnswer((_) async {
      if (answer is DioException) throw answer;
      return answer as Response<dynamic>;
    });
  }

  Map<String, dynamic> capturedCreatePayload() {
    final captured = verify(() => dio.post<dynamic>(
          '/checkout/sessions',
          data: captureAny(named: 'data'),
          options: any(named: 'options'),
        )).captured;
    return captured.last as Map<String, dynamic>;
  }

  Future<void> openPayment(WidgetTester tester) async {
    await tester.tap(find.text('Continue to Payment'));
    await tester.pumpAndSettle();
    expect(find.text('Payment Details'), findsOneWidget);
  }

  /// Taps the saved card whose last four digits match.
  Future<void> selectSavedCard(WidgetTester tester, {String last4 = '4242'}) async {
    await tester.tap(find.text('Saved Cards'));
    await tester.pumpAndSettle();
    await tester.tap(find.textContaining('•••• $last4').first);
    await tester.pumpAndSettle();
  }

  /// The button spins while the session is in progress, so pumpAndSettle would never return.
  Future<void> placeOrder(WidgetTester tester) async {
    await tester.tap(find.text('Place Order'));
    for (var i = 0; i < 20; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    await tester.pumpAndSettle();
  }

  /// Simulates the native CardFormField reporting a complete card.
  Future<void> completeCardForm(WidgetTester tester) async {
    expect(cardViewId, isNotNull, reason: 'CardFormField was not created');
    final channel = 'flutter.stripe/card_form_field/$cardViewId';
    const codec = StandardMethodCodec();
    await tester.binding.defaultBinaryMessenger.handlePlatformMessage(
      channel,
      codec.encodeMethodCall(const MethodCall('onFormComplete', {
        'complete': true,
        'brand': 'Visa',
        'last4': '4242',
        'expiryMonth': 12,
        'expiryYear': 2030,
      })),
      (_) {},
    );
    await tester.pump();
  }

  /// New card: one Place Order creates the card and then starts the session (as the legacy path does).
  Future<void> placeNewCardOrder(WidgetTester tester) async {
    await completeCardForm(tester);
    await placeOrder(tester);
  }

  bool placeOrderEnabled(WidgetTester tester) {
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Place Order'),
    );
    return button.onPressed != null;
  }

  void expectOrdersPlaced(List<String> ids) {
    expect(find.text('Orders placed: ${ids.join(', ')}'), findsOneWidget);
    expect(find.text('Payment Details'), findsNothing);
  }

  // -- session flow scenarios -------------------------------------------------

  group('checkout session flow', () {
    testWidgets('new card, one seller: the session opens, the seller is held with the new card, and the order is placed',
        (tester) async {
      stripe.onConfirm = _holdAll;
      stubCreate([_respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 201)]);
      stubConfirmSession(_respond(_placedEnvelope([
        {'id': 'ord-1', 'sellerId': 's1', 'status': 'pending', 'total': 54.0, 'shortAuthorization': false},
      ])));

      await pumpSession(tester);
      await openPayment(tester);
      await placeNewCardOrder(tester);

      // The payload carries the cart and the buyer's choices, and no totals.
      final payload = capturedCreatePayload();
      expect(payload.containsKey('total'), isFalse);
      expect(payload.containsKey('subtotal'), isFalse);
      expect(payload['items'], isNotEmpty);
      expect(payload.containsKey('savedPaymentMethodId'), isFalse);

      // The card is held with the new card's PaymentMethod, then the orders are placed once.
      expect(stripe.confirmedSecrets, ['pi_s1_secret']);
      expect(stripe.confirmedMethodIds, ['pm_new_card']);
      verify(() => dio.post<dynamic>('/checkout/sessions/$_sessionId/confirm')).called(1);
      expectOrdersPlaced(['ord-1']);
    });

    testWidgets('saved card: the server attaches the saved card and the hold uses it', (tester) async {
      stripe.onConfirm = _holdAll;
      stubCreate([_respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 201)]);
      stubConfirmSession(_respond(_placedEnvelope([{'id': 'ord-2', 'sellerId': 's1', 'status': 'pending', 'total': 54.0, 'shortAuthorization': false}])));

      await pumpSession(tester);
      await openPayment(tester);
      await selectSavedCard(tester, last4: '5555');
      await placeOrder(tester);

      expect(capturedCreatePayload()['savedPaymentMethodId'], 'pm_saved_2');
      expect(stripe.confirmedMethodIds, ['pm_saved_2']);
      expectOrdersPlaced(['ord-2']);
    });

    testWidgets('two sellers: each is held in turn, then the orders are placed once', (tester) async {
      stripe.onConfirm = _holdAll;
      stubCreate([
        _respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret'), _seller('s2', secret: 'pi_s2_secret')])), status: 201),
      ]);
      stubConfirmSession(_respond(_placedEnvelope([
          {'id': 'ord-1', 'sellerId': 's1', 'status': 'pending', 'total': 27.0, 'shortAuthorization': false},
          {'id': 'ord-2', 'sellerId': 's2', 'status': 'pending', 'total': 27.0, 'shortAuthorization': false},
        ])));

      await pumpSession(tester);
      await openPayment(tester);
      await placeNewCardOrder(tester);

      expect(stripe.confirmedSecrets, ['pi_s1_secret', 'pi_s2_secret']);
      verify(() => dio.post<dynamic>('/checkout/sessions/$_sessionId/confirm')).called(1);
      expectOrdersPlaced(['ord-1', 'ord-2']);
    });

    testWidgets('cancelled verification: the seller stays pending, no order is placed, and Place Order retries',
        (tester) async {
      stripe.onConfirm = () async => throw _stripeError(FailureCode.Canceled);
      stubCreate([_respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 201)]);

      await pumpSession(tester);
      await openPayment(tester);
      await placeNewCardOrder(tester);

      expect(find.text(StripeErrorMessages.getErrorMessage('payment_cancelled')), findsOneWidget);
      verifyNever(() => dio.post<dynamic>('/checkout/sessions/$_sessionId/confirm'));
      expect(find.text('Payment Details'), findsOneWidget);
      expect(placeOrderEnabled(tester), isTrue);

      // Retry: the same session is replayed and the seller is held this time.
      stripe.onConfirm = _holdAll;
      stubCreate([_respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 200)]);
      stubConfirmSession(_respond(_placedEnvelope([{'id': 'ord-1', 'sellerId': 's1', 'status': 'pending', 'total': 54.0, 'shortAuthorization': false}])));
      await placeOrder(tester);

      expect(stripe.confirmCalls, 2);
      expectOrdersPlaced(['ord-1']);
    });

    testWidgets('declined card: the bank message is shown, and a retry with a card that works places the order',
        (tester) async {
      stripe.onConfirm = () async => throw _stripeError(FailureCode.Failed, message: 'Your card was declined.');
      stubCreate([_respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 201)]);

      await pumpSession(tester);
      await openPayment(tester);
      await placeNewCardOrder(tester);

      expect(find.text('Your card was declined.'), findsOneWidget);
      verifyNever(() => dio.post<dynamic>('/checkout/sessions/$_sessionId/confirm'));

      stripe.onConfirm = _holdAll;
      stubCreate([_respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 200)]);
      stubConfirmSession(_respond(_placedEnvelope([{'id': 'ord-1', 'sellerId': 's1', 'status': 'pending', 'total': 54.0, 'shortAuthorization': false}])));
      await placeOrder(tester);

      expectOrdersPlaced(['ord-1']);
    });

    testWidgets('failed order placement: holds are kept, the buyer sees the seller amounts and status, and a retry never holds twice',
        (tester) async {
      stripe.onConfirm = _holdAll;
      stubCreate([
        _respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 201),
        // The replay after the failure lists the seller again, with its secret.
        _respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 200),
      ]);
      stubConfirmSession(_apiError(500, {'success': false, 'message': 'Order service down'}));

      await pumpSession(tester);
      await openPayment(tester);
      await placeNewCardOrder(tester);

      expect(find.text('Order service down'), findsOneWidget);
      expect(find.text('Seller s1'), findsOneWidget);
      expect(find.text('\$25.00'), findsOneWidget);
      expect(find.text('Reserved'), findsOneWidget);
      expect(find.textContaining('reserved now'), findsOneWidget);

      // Retry: the seller is already held in Stripe, so it is not confirmed again.
      stubConfirmSession(_respond(_placedEnvelope([{'id': 'ord-1', 'sellerId': 's1', 'status': 'pending', 'total': 54.0, 'shortAuthorization': false}])));
      await placeOrder(tester);

      expect(stripe.confirmCalls, 1);
      expectOrdersPlaced(['ord-1']);
    });

    testWidgets('restart: a stored session is resumed with its sellers pending, and nothing is held until Place Order',
        (tester) async {
      // First run: the verification is cancelled, which leaves the session stored.
      stripe.onConfirm = () async => throw _stripeError(FailureCode.Canceled);
      stubCreate([_respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')])), status: 201)]);
      await pumpSession(tester);
      await openPayment(tester);
      await placeNewCardOrder(tester);
      expect(stripe.confirmCalls, 1);

      // Restart: a new app run opens the checkout again. A new key rebuilds the whole app,
      // so no route from the first run stays on the stack.
      when(() => dio.get<dynamic>('/checkout/sessions/$_sessionId')).thenAnswer(
        (_) async => _respond(_envelope(_session(sellers: [_seller('s1', secret: 'pi_s1_secret')]))),
      );
      await tester.pumpWidget(MaterialApp(
        key: UniqueKey(),
        home: _SessionHarness(dio: dio, buyerId: 'buyer-1'),
      ));
      await tester.pumpAndSettle();
      await openPayment(tester);

      verify(() => dio.get<dynamic>('/checkout/sessions/$_sessionId')).called(1);
      expect(find.text('Awaiting payment'), findsOneWidget);
      // Nothing was held or created by reopening.
      expect(stripe.confirmCalls, 1);
      verify(() => dio.post<dynamic>(
            '/checkout/sessions',
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).called(1);
    });

    testWidgets('idempotency conflict: the cart changed, so the buyer is told to place the order again',
        (tester) async {
      stubCreate([
        _apiError(409, _structuredError('idempotency_conflict',
            'This Idempotency-Key was already used for a different checkout')),
      ]);

      await pumpSession(tester);
      await openPayment(tester);
      await placeNewCardOrder(tester);

      expect(
        find.text('Your cart or delivery details changed since you started checkout. Review your order and place it again.'),
        findsOneWidget,
      );
      expect(stripe.confirmCalls, 0);
    });
  });

  // -- legacy flow (kept; skipped until phase 4 removes the legacy path) -----

  Future<void> pumpCheckout(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    // Created here (inside the test's FakeAsync zone) rather than in setUp, so
    // its stream/microtasks are driven by tester.pump().
    checkoutBloc = CheckoutBloc(orders);
    addTearDown(() => checkoutBloc.close());
    await tester.pumpWidget(MaterialApp(
      home: _CheckoutHarness(dio: dio, checkoutBloc: checkoutBloc),
    ));
    await tester.pumpAndSettle();
  }

  void expectOnConfirmation() {
    expect(find.text('Order Confirmed'), findsOneWidget);
    expect(find.text('Thank you for your order!'), findsOneWidget);
    expect(find.text('ORD12345'), findsOneWidget);
    expect(find.text('Test Sneakers'), findsOneWidget);
    expect(find.text('Continue Shopping'), findsOneWidget);
    // Payment screen is replaced, not stacked.
    expect(find.text('Place Order'), findsNothing);
  }

  group('legacy checkout integration', () {
    testWidgets(
        '1. new card: enter details -> Place Order -> payment succeeds -> '
        'confirmation shown', (tester) async {
      await pumpCheckout(tester);
      await openPayment(tester);

      // New Card tab is the default; Place Order is enabled so the card is
      // created on click.
      expect(find.byType(CardFormField), findsOneWidget);
      expect(placeOrderEnabled(tester), isTrue);

      await completeCardForm(tester);
      await tester.tap(find.text('Place Order'));
      await tester.pumpAndSettle();

      expect(stripe.createPaymentMethodCalls, 1);
      expect(find.text('Payment method created successfully'), findsOneWidget);
      expect(placeOrderEnabled(tester), isTrue);

      await placeOrder(tester);

      verify(() => dio.post('/payments/create-intent', data: {
            'amountInCents': _amountInCents,
            'stripePaymentMethodId': 'pm_new_card',
          })).called(1);
      expect(stripe.confirmCalls, 1);
      final captured = verify(() => orders.createOrder(captureAny()))
          .captured
          .single as Map<String, dynamic>;
      expect(captured['paymentIntentId'], _intentId);
      expect(checkoutBloc.state, isA<OrderCreated>());

      expectOnConfirmation();
      expect(find.text('Visa ending in 4242'), findsOneWidget);
    });

    testWidgets(
        '2. saved card: pick card -> Place Order -> payment succeeds -> '
        'confirmation shown', (tester) async {
      await pumpCheckout(tester);
      await openPayment(tester);

      await tester.tap(find.text('Saved Cards'));
      await tester.pumpAndSettle();
      expect(find.text('visa •••• 4242'), findsOneWidget);
      expect(find.text('mastercard •••• 5555'), findsOneWidget);
      expect(placeOrderEnabled(tester), isFalse);

      await tester.tap(find.byType(Radio<String>).at(1));
      await tester.pumpAndSettle();
      expect(placeOrderEnabled(tester), isTrue);

      await placeOrder(tester);

      verify(() => dio.post('/payments/create-intent', data: {
            'amountInCents': _amountInCents,
            'stripePaymentMethodId': 'pm_saved_2',
          })).called(1);
      expect(stripe.confirmCalls, 1);
      verify(() => orders.createOrder(any())).called(1);

      expectOnConfirmation();
      expect(find.text('Mastercard ending in 5555'), findsOneWidget);

      // Continue Shopping returns to the root of the flow.
      await tester.tap(find.text('Continue Shopping'));
      await tester.pumpAndSettle();
      expect(find.text('Checkout'), findsOneWidget);
      expect(find.text('Order Confirmed'), findsNothing);
    });

    testWidgets('3. cancellation: start payment -> cancel -> back to checkout',
        (tester) async {
      stripe.onConfirm = () async => throw _stripeError(FailureCode.Canceled);

      await pumpCheckout(tester);
      await openPayment(tester);
      await selectSavedCard(tester);
      await placeOrder(tester);

      // Payment attempted, then aborted by the user: no order, no
      // confirmation, still on the payment screen with the button usable.
      expect(stripe.confirmCalls, 1);
      verifyNever(() => orders.createOrder(any()));
      expect(find.text('Order Confirmed'), findsNothing);
      expect(find.text('Payment Details'), findsOneWidget);
      expect(placeOrderEnabled(tester), isTrue);
      expect(
        find.text(StripeErrorMessages.getErrorMessage('payment_cancelled')),
        findsOneWidget,
      );

      // Navigate back to checkout.
      await tester.tap(find.byIcon(Icons.arrow_back));
      await tester.pumpAndSettle();
      expect(find.text('Checkout'), findsOneWidget);
      expect(find.text('Continue to Payment'), findsOneWidget);
      expect(find.text('Payment Details'), findsNothing);
      expect(checkoutBloc.state, isA<CheckoutInitial>());
    });

    testWidgets('4. payment failure: error shown, retry succeeds',
        (tester) async {
      stripe.onConfirm = () async => throw _stripeError(FailureCode.Failed);

      await pumpCheckout(tester);
      await openPayment(tester);
      await selectSavedCard(tester);
      await placeOrder(tester);

      expect(stripe.confirmCalls, 1);
      expect(
        find.text(StripeErrorMessages.getErrorMessage('unknown_error')),
        findsOneWidget,
      );
      verifyNever(() => orders.createOrder(any()));
      expect(find.text('Order Confirmed'), findsNothing);
      expect(find.text('Place Order'), findsOneWidget);
      expect(placeOrderEnabled(tester), isTrue);
      // Saved cards list and the selection survive the failure.
      expect(find.text('visa •••• 4242'), findsOneWidget);

      // Retry: Stripe now accepts the payment.
      stripe.onConfirm = () async => _FakePaymentIntent();
      await placeOrder(tester);

      expect(stripe.confirmCalls, 2);
      verify(() => orders.createOrder(any())).called(1);
      expectOnConfirmation();
    });

    testWidgets(
        '5. order creation failure: payment succeeds but order API fails -> '
        'error snackbar, retry succeeds', (tester) async {
      when(() => orders.createOrder(any()))
          .thenAnswer((_) async => throw Exception('orders api down'));

      await pumpCheckout(tester);
      await openPayment(tester);
      await selectSavedCard(tester);
      await placeOrder(tester);

      // Payment went through, order did not: PaymentScreen is popped back to
      // checkout and the user is told.
      expect(stripe.confirmCalls, 1);
      expect(checkoutBloc.state, isA<OrderCreationFailed>());
      expect(find.text('Order Confirmed'), findsNothing);
      expect(find.text('Checkout'), findsOneWidget);
      expect(find.text('Place Order'), findsNothing);
      expect(
        find.textContaining(
            'Payment succeeded but the order could not be created'),
        findsOneWidget,
      );
      expect(find.textContaining('orders api down'), findsOneWidget);

      // Retry: order API recovers; go through payment again.
      when(() => orders.createOrder(any()))
          .thenAnswer((_) async => [_order()]);
      await openPayment(tester);
      await selectSavedCard(tester);
      await placeOrder(tester);

      expect(stripe.confirmCalls, 2);
      expect(checkoutBloc.state, isA<OrderCreated>());
      verify(() => orders.createOrder(any())).called(2);
      expectOnConfirmation();
    });
  }, skip: 'Legacy one-step charge: removed with the legacy path in phase 4');
}
