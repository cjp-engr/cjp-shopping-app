import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/refunds/presentation/refund_request_panel.dart';
import 'package:toko_mart/features/refunds/presentation/refund_review_panel.dart';
import 'package:toko_mart/features/refunds/presentation/completed_refunds.dart';
import 'package:toko_mart/features/refunds/presentation/refund_request_card.dart';
import 'package:toko_mart/features/seller/data/models/seller_order_model.dart';
import 'package:toko_mart/features/seller/presentation/bloc/seller_state.dart';
import 'package:toko_mart/core/utils/order_payment_notice.dart';
import 'package:toko_mart/features/orders/data/models/order_model.dart';

class FakeApi extends Mock implements RefundApi {}

void main() {
  for (final size in [const Size(375, 812), const Size(812, 375)]) {
    testWidgets('refund cards support dark mode and large text at $size',
        (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(MaterialApp(
          theme: ThemeData.dark(),
          home: MediaQuery(
              data: MediaQueryData(
                  size: size, textScaler: const TextScaler.linear(2)),
              child: Scaffold(
                  body: SingleChildScrollView(
                      child: RefundRequestCard(
                          sellerReview: true,
                          request: RefundRequestData.fromJson({
                            'id': 'r',
                            'orderId': '12345678',
                            'state': 'refunded',
                            'amountMinor': 10038,
                            'shippingMinor': 1399,
                            'description': 'The wrong backpack was delivered.',
                            'units': [
                              {
                                'lineId': 'a',
                                'ordinal': 1,
                                'productName':
                                    'Hiking Backpack – a long item name that wraps',
                                'merchandiseMinor': 7999,
                                'taxMinor': 640
                              }
                            ]
                          })))))));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(find.text('Refunded'), findsOneWidget);
      expect(find.text('Shipping refund'), findsOneWidget);
    });
  }
  testWidgets(
      'refund tab shows seller-approved requests, hides ones still waiting, and pages safely',
      (tester) async {
    final api = FakeApi();
    when(() => api.completed(1))
        .thenAnswer((_) async => SellerRefundPage.fromJson({
              'page': 1,
              'pages': 2,
              'total': 2,
              'requests': [
                {
                  'id': 'r1',
                  'orderId': 'o',
                  'state': 'refunded',
                  'amountMinor': 1080,
                  'description': 'Completed refund'
                },
                {
                  'id': 'approved',
                  'orderId': 'o2',
                  'state': 'processing',
                  'amountMinor': 500,
                  'decidedAt': '2026-10-19T02:00:00Z',
                  'description': 'Approved, still processing'
                },
                {
                  'id': 'waiting',
                  'state': 'requested',
                  'amountMinor': 700,
                  'description': 'Still waiting for the seller'
                }
              ]
            }));
    when(() => api.completed(2))
        .thenAnswer((_) async => SellerRefundPage.fromJson({
              'page': 2,
              'pages': 2,
              'total': 2,
              'requests': [
                {'id': 'r2', 'state': 'refunded', 'amountMinor': 300}
              ]
            }));
    await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: CompletedRefunds(api: api))));
    await tester.pumpAndSettle();
    expect(find.text('Refunded'), findsOneWidget);
    expect(find.text('Refund processing'), findsOneWidget);
    expect(find.text('Awaiting seller review'), findsNothing);
    expect(find.text('Approved by the seller. Your refund is processing.'),
        findsOneWidget);
    expect(find.textContaining('Approved '), findsWidgets);
    expect(find.text('Still waiting for the seller'), findsNothing);
    await tester.scrollUntilVisible(find.text('Next'), 300);
    await tester.tap(find.text('Next'));
    await tester.pumpAndSettle();
    verify(() => api.completed(2)).called(1);
    expect(find.text('Page 2 of 2'), findsOneWidget);
  });
  test(
      'confirmed refunds reduce seller revenue and partial legacy payment gets a notice',
      () {
    final order = SellerOrderData.fromJson({
      'id': 'o',
      'status': 'delivered',
      'total': 21.6,
      'currency': 'usd',
      'refundedAmountMinor': 500
    });
    expect(SellerState(orders: [order]).revenue, 16.6);
    expect(order.copyWith(status: 'delivered').refundedAmountMinor, 500);
    final buyer = OrderModel.fromJson(const {
      'status': 'delivered',
      'paymentStatus': 'partially_refunded',
      'refundedAmountMinor': 500
    });
    expect(buyer.refundedAmountMinor, 500);
    expect(orderPaymentNotice(buyer)?.title, 'Partially refunded');
  });
  testWidgets(
      'buyer selects units and submits a refund reason, without a client amount',
      (tester) async {
    final api = FakeApi();
    when(() => api.eligibility('o'))
        .thenAnswer((_) async => RefundEligibility.fromJson({
              'eligible': true,
              'requestsEnabled': true,
              'currency': 'usd',
              'lines': [
                {
                  'lineId': 'a',
                  'productName': 'Mug',
                  'quantityAvailable': 2,
                  'availableUnitAmountsMinor': [1080, 1080]
                },
              ]
            }));
    when(() => api.history('o')).thenAnswer((_) async => []);
    when(() => api.submit('o', any())).thenAnswer((_) async =>
        RefundRequestData.fromJson(
            {'id': 'r', 'state': 'requested', 'units': []}));
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: SingleChildScrollView(
                child: RefundRequestPanel(orderId: 'o', api: api)))));
    await tester.pumpAndSettle();
    await tester.enterText(
        find.byKey(const ValueKey('refund_quantity_a')), '1');
    await tester.enterText(
        find.byKey(const ValueKey('refund_description')), 'Broken handle');
    await tester.pump();
    await tester.ensureVisible(find.text('Submit refund request'));
    await tester.tap(find.text('Submit refund request'));
    await tester.pumpAndSettle();
    final payload =
        verify(() => api.submit('o', captureAny())).captured.single as Map;
    expect(payload['items'], [
      {'lineId': 'a', 'quantity': 1}
    ]);
    expect(payload.containsKey('amountMinor'), isFalse);
  });
  testWidgets(
      'seller rejection requires a reason and approval requires confirmation',
      (tester) async {
    final api = FakeApi();
    when(() => api.sellerList(1))
        .thenAnswer((_) async => SellerRefundPage.fromJson({
              'page': 1,
              'pages': 1,
              'total': 1,
              'requests': [
                {
                  'id': 'r',
                  'orderId': 'o',
                  'state': 'requested',
                  'canDecide': true,
                  'amountMinor': 1080,
                  'currency': 'usd',
                  'units': [],
                  'description': 'Broken'
                },
              ]
            }));
    when(() => api.decide('r', 'approve', any())).thenAnswer((_) async =>
        RefundRequestData.fromJson(
            {'id': 'r', 'state': 'processing', 'units': []}));
    await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: RefundReviewList(api: api))));
    await tester.pumpAndSettle();
    expect(find.byType(TextField), findsNothing);
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Reject request'));
    await tester.tap(find.text('Reject request'));
    await tester.pumpAndSettle();
    final reject = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'Confirm rejection'));
    expect(reject.onPressed, isNull);
    await tester.drag(find.byType(ListView), const Offset(0, -300));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Approve refund'));
    await tester.tap(find.text('Approve refund'));
    await tester.pumpAndSettle();
    verifyNever(() => api.decide('r', any(), any()));
    await tester.tap(find.text('Approve and refund'));
    await tester.pumpAndSettle();
    verify(() => api.decide('r', 'approve', any())).called(1);
  });
}
