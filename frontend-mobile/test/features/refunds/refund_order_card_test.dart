import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/refunds/presentation/refund_order_card.dart';

Map<String, dynamic> _json({
  String state = 'refunded',
  List<Map<String, dynamic>>? units,
  Map<String, dynamic> extra = const {},
}) =>
    {
      'id': 'r1',
      'orderId': '6ad4d9ac1234567890abcdef',
      'state': state,
      'amountMinor': 10038,
      'shippingMinor': 1399,
      'currency': 'usd',
      'reasonCode': 'wrong_item',
      'description': 'I ordered the 40L backpack.',
      'submittedAt': '2026-10-18T14:39:00Z',
      'completedAt': '2026-10-19T01:00:00Z',
      'sellerName': 'SellerX Xavier',
      'buyerName': 'Buyer1 Monte Cristo',
      'orderPlacedAt': '2026-10-18T10:00:00Z',
      'units': units ??
          [
            {
              'lineId': 'a',
              'ordinal': 1,
              'productName': 'Hiking Backpack - 40L',
              'merchandiseMinor': 7999,
              'taxMinor': 640,
            }
          ],
      ...extra,
    };

Widget _card(Map<String, dynamic> json,
        {RefundViewer viewer = RefundViewer.buyer,
        Widget? decision,
        VoidCallback? onViewOrder,
        double textScale = 1}) =>
    MaterialApp(
        home: MediaQuery(
            data: MediaQueryData(
                size: const Size(375, 812),
                textScaler: TextScaler.linear(textScale)),
            child: Scaffold(
                body: SingleChildScrollView(
                    child: RefundOrderCard(
                        request: RefundRequestData.fromJson(json),
                        viewer: viewer,
                        decision: decision,
                        onViewOrder: onViewOrder)))));

void main() {
  testWidgets(
      'buyer card is laid out like an order card: store and status, order number and date, item, total, banner, actions',
      (tester) async {
    var opened = 0;
    await tester.pumpWidget(_card(_json(), onViewOrder: () => opened++));

    expect(find.text('SellerX Xavier'), findsOneWidget);
    expect(find.text('Refunded'), findsOneWidget);
    expect(find.textContaining('Order #6AD4D9AC'), findsOneWidget);
    expect(find.textContaining('October 18, 2026'), findsOneWidget);
    expect(find.text('Hiking Backpack - 40L'), findsOneWidget);
    expect(find.text('x1 · Wrong item'), findsOneWidget);
    expect(find.text(r'$86.39'), findsOneWidget);
    expect(
        find.text('1 item refunded · incl. \$13.99 shipping'), findsOneWidget);
    expect(find.text(r'$100.38'), findsOneWidget);
    expect(
        find.text(
            'The refund is confirmed. Your bank may take additional time to post it.'),
        findsOneWidget);
    expect(find.textContaining('Completed '), findsOneWidget);

    await tester.tap(find.text('View Details'));
    expect(opened, 1);
  });

  testWidgets('refund details expand to the explanation and the breakdown',
      (tester) async {
    await tester.pumpWidget(_card(_json()));
    expect(find.text('I ordered the 40L backpack.'), findsNothing);

    await tester.tap(find.text('Refund details'));
    await tester.pumpAndSettle();

    expect(find.text('YOUR EXPLANATION'), findsOneWidget);
    expect(find.text('I ordered the 40L backpack.'), findsOneWidget);
    expect(find.text('Items after discounts'), findsOneWidget);
    expect(find.text('Original tax'), findsOneWidget);
    expect(find.text('Shipping refund'), findsOneWidget);
  });

  testWidgets(
      'shows one row per line with the quantity, line total and amount each',
      (tester) async {
    final units = [
      for (final n in [1, 2, 3])
        {
          'lineId': 'a',
          'ordinal': n,
          'productName': 'Mug',
          'merchandiseMinor': 1000,
          'taxMinor': 80
        }
    ];
    await tester.pumpWidget(_card(
        _json(units: units, extra: {'amountMinor': 3240, 'shippingMinor': 0})));

    expect(find.text('x3 · Wrong item'), findsOneWidget);
    expect(find.text(r'$10.80 each'), findsOneWidget);
    expect(find.text('3 items refunded'), findsOneWidget);
    expect(find.textContaining('shipping'), findsNothing);
  });

  testWidgets('does not invent an each-price when units differ by a cent',
      (tester) async {
    final units = [
      {
        'lineId': 'a',
        'ordinal': 1,
        'productName': 'Mug',
        'merchandiseMinor': 34
      },
      {
        'lineId': 'a',
        'ordinal': 2,
        'productName': 'Mug',
        'merchandiseMinor': 33
      },
    ];
    await tester.pumpWidget(_card(
        _json(units: units, extra: {'amountMinor': 67, 'shippingMinor': 0})));
    expect(find.textContaining('each'), findsNothing);
  });

  testWidgets('describes an approved, still-processing refund as approved',
      (tester) async {
    await tester.pumpWidget(_card(_json(
        state: 'processing',
        extra: {'completedAt': null, 'decidedAt': '2026-10-19T02:00:00Z'})));

    expect(find.text('Refund processing'), findsOneWidget);
    expect(find.text('Approved by the seller. Your refund is processing.'),
        findsOneWidget);
    expect(find.textContaining('Approved Oct'), findsOneWidget);
    expect(find.textContaining('items refunded'), findsNothing);
    expect(find.textContaining('1 item approved'), findsOneWidget);
  });

  testWidgets(
      'seller card shows the buyer, asks for a decision, and hosts the controls',
      (tester) async {
    await tester.pumpWidget(_card(
        _json(state: 'requested', extra: {'completedAt': null}),
        viewer: RefundViewer.seller,
        decision: const Text('decision controls')));

    expect(find.text('Buyer1 Monte Cristo'), findsOneWidget);
    expect(find.text('SellerX Xavier'), findsNothing);
    expect(find.text('Awaiting seller review'), findsOneWidget);
    expect(
        find.text(
            'Awaiting your decision. The buyer keeps the item if you approve.'),
        findsOneWidget);
    expect(find.textContaining('1 item requested'), findsOneWidget);
    expect(find.text('decision controls'), findsOneWidget);
    expect(find.text('View Details'), findsNothing);

    await tester.tap(find.text('Refund details'));
    await tester.pumpAndSettle();
    expect(find.text('BUYER’S EXPLANATION'), findsOneWidget);
  });

  testWidgets('seller card shows a rejection with its reason and date',
      (tester) async {
    await tester.pumpWidget(_card(
        _json(state: 'rejected', extra: {
          'completedAt': null,
          'decidedAt': '2026-10-19T03:00:00Z',
          'rejectionReason': 'Item was used'
        }),
        viewer: RefundViewer.seller));

    expect(find.text('Rejected'), findsOneWidget);
    expect(find.text('You rejected this request.'), findsOneWidget);
    expect(find.text('Reason: Item was used'), findsOneWidget);
    expect(find.textContaining('Rejected Oct'), findsOneWidget);
    expect(find.textContaining('1 item rejected'), findsOneWidget);
  });

  testWidgets('falls back to Store and Buyer, no date and a placeholder image',
      (tester) async {
    await tester.pumpWidget(_card(_json(extra: {
      'sellerName': null,
      'orderPlacedAt': null,
      'units': [
        {'lineId': 'a', 'ordinal': 1, 'merchandiseMinor': 1000}
      ]
    })));
    expect(find.text('Store'), findsOneWidget);
    expect(find.text('Order item'), findsOneWidget);
    expect(find.byIcon(Icons.inventory_2_outlined), findsOneWidget);
    expect(find.text('Order #6AD4D9AC'), findsOneWidget);

    await tester.pumpWidget(
        _card(_json(extra: {'buyerName': ''}), viewer: RefundViewer.seller));
    expect(find.text('Buyer'), findsOneWidget);
  });

  testWidgets(
      'keeps a long name and large text inside the card without overflow',
      (tester) async {
    await tester.pumpWidget(_card(
        _json(units: [
          {
            'lineId': 'a',
            'ordinal': 1,
            'productName':
                'Hiking Backpack – a very long item name that has to wrap over several lines',
            'merchandiseMinor': 7999,
            'taxMinor': 640
          }
        ], extra: {
          'sellerName': 'A Seller Whose Store Name Is Also Rather Long Indeed'
        }),
        textScale: 2,
        onViewOrder: () {}));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
