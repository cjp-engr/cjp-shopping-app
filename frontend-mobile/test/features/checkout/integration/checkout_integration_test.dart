// Integration tests for the full checkout payment flow.
//
// These run as flutter_test widget tests (no device needed) and exercise the
// real widgets and blocs together: PaymentScreen + PaymentBloc + CheckoutBloc
// + OrderConfirmationScreen, with Navigator routing between them.
//
// Only the outer boundaries are faked:
//  * HTTP layer        -> mocktail Dio (payment methods / create-intent)
//  * Order API         -> mocktail OrderRepository
//  * Stripe native SDK -> _FakeStripePlatform (createPaymentMethod /
//                         confirmPayment) plus a mocked platform-view channel
//                         so CardFormField can be built.
//
// The harness (_CheckoutHarness) mirrors the wiring in checkout_screen.dart
// `_openPaymentScreen`, but drives order creation through CheckoutBloc
// (OrderRepository) instead of OrderBloc.
import 'package:dio/dio.dart';
import 'package:flutter/material.dart' hide Card;
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
// ignore: depend_on_referenced_packages
import 'package:plugin_platform_interface/plugin_platform_interface.dart';
import 'package:toko_mart/core/constants/stripe_error_messages.dart';
import 'package:toko_mart/features/checkout/bloc/checkout_bloc.dart';
import 'package:toko_mart/features/checkout/bloc/payment_bloc.dart';
import 'package:toko_mart/features/checkout/screens/order_confirmation_screen.dart';
import 'package:toko_mart/features/checkout/screens/payment_screen.dart';
import 'package:toko_mart/features/orders/domain/entities/order_entity.dart';
import 'package:toko_mart/features/orders/domain/repositories/order_repository.dart';

// -- Fakes / mocks ------------------------------------------------------------

class _MockDio extends Mock implements Dio {}

class _MockOrderRepository extends Mock implements OrderRepository {}

class _FakePaymentIntent extends Fake implements PaymentIntent {
  @override
  PaymentIntentsStatus get status => PaymentIntentsStatus.Succeeded;
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
  ) {
    confirmCalls++;
    return onConfirm();
  }
}

// -- Test data ----------------------------------------------------------------

const _intentId = 'pi_test_123';
const _clientSecret = 'pi_test_123_secret_abc';
const _amountInCents = 5000;

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

Response<dynamic> _ok(Object data) => Response<dynamic>(
      requestOptions: RequestOptions(path: ''),
      statusCode: 200,
      data: data,
    );

StripeException _stripeError(FailureCode code) => StripeException(
      error: LocalizedErrorMessage(code: code, message: 'stripe says no'),
    );

// -- Harness: checkout page -> PaymentScreen -> OrderConfirmationScreen -------

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
  });

  setUp(() {
    // Stripe caches its settings Future; one created inside a previous test's
    // FakeAsync zone would never resolve in this one, so force a fresh one.
    Stripe.instance.markNeedsSettings();
    stripe
      ..onConfirm = (() async => _FakePaymentIntent())
      ..confirmCalls = 0
      ..createPaymentMethodCalls = 0;

    dio = _MockDio();
    when(() => dio.get('/auth/payment-methods')).thenAnswer(
      (_) async => _ok({
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
      (_) async => _ok({
        'paymentIntentId': _intentId,
        'clientSecret': _clientSecret,
      }),
    );
    when(() => dio.post('/auth/payment-methods', data: any(named: 'data')))
        .thenAnswer((_) async => _ok({}));

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

  Future<void> openPayment(WidgetTester tester) async {
    await tester.tap(find.text('Continue to Payment'));
    await tester.pumpAndSettle();
    expect(find.text('Payment'), findsOneWidget);
  }

  Future<void> selectSavedCard(WidgetTester tester, {int index = 0}) async {
    await tester.tap(find.text('Saved Cards'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Radio<String>).at(index));
    await tester.pumpAndSettle();
  }

  Future<void> placeOrder(WidgetTester tester) async {
    await tester.tap(find.text('Place Order'));
    // Drive the async chain (create-intent -> confirm -> create order ->
    // navigation) with several short pumps; the in-button spinner animates
    // forever so pumpAndSettle alone cannot be used while loading.
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

  bool placeOrderEnabled(WidgetTester tester) {
    final button = tester.widget<ElevatedButton>(
      find.widgetWithText(ElevatedButton, 'Place Order'),
    );
    return button.onPressed != null;
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

  // -- scenarios --------------------------------------------------------------

  group('checkout integration', () {
    testWidgets(
        '1. new card: enter details -> Place Order -> payment succeeds -> '
        'confirmation shown', (tester) async {
      await pumpCheckout(tester);
      await openPayment(tester);

      // New Card tab is the default and Place Order is gated on a created
      // payment method.
      expect(find.byType(CardFormField), findsOneWidget);
      expect(placeOrderEnabled(tester), isFalse);

      await completeCardForm(tester);
      await tester.tap(find.text('Create Payment Method'));
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
      expect(find.text('Payment'), findsOneWidget);
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
      expect(find.text('Payment'), findsNothing);
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
  });
}
