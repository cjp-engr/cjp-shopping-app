import 'package:flutter/rendering.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/constants/app_colors.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
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
        bool inOrder = false,
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
                        inOrder: inOrder,
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
    expect(find.text('Your reason'), findsOneWidget);
    expect(find.text('Item was used'), findsOneWidget);
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

  group("inside the buyer's own order page (inOrder)", () {
    testWidgets(
        'drops what the page already shows: store name, order strip and View Details',
        (tester) async {
      await tester.pumpWidget(_card(
          _json(extra: {'sellerName': null, 'orderPlacedAt': null}),
          inOrder: true,
          onViewOrder: () {}));

      expect(find.text('Refund request'), findsOneWidget);
      expect(find.text('Store'), findsNothing);
      expect(find.textContaining('Order #'), findsNothing);
      expect(find.text('View Details'), findsNothing);
      expect(find.text('Refund details'), findsOneWidget);
      expect(find.text('Hiking Backpack - 40L'), findsOneWidget);
      expect(find.text(r'$100.38'), findsOneWidget);
    });

    testWidgets('says a request is waiting for the seller', (tester) async {
      await tester.pumpWidget(_card(
          _json(state: 'requested', extra: {'completedAt': null}),
          inOrder: true));

      expect(find.text('Awaiting seller review'), findsOneWidget);
      expect(
          find.text('Waiting for the seller. You can check the decision here.'),
          findsOneWidget);
      expect(find.textContaining('1 item requested'), findsOneWidget);
      expect(find.textContaining('Submitted Oct'), findsOneWidget);
    });

    testWidgets("shows a rejection with the seller's reason", (tester) async {
      await tester.pumpWidget(_card(
          _json(state: 'rejected', extra: {
            'completedAt': null,
            'decidedAt': '2026-10-19T03:00:00Z',
            'rejectionReason': 'Item was used'
          }),
          inOrder: true));

      expect(find.text('The seller rejected this request.'), findsOneWidget);
      expect(find.text('Seller’s reason'), findsOneWidget);
      expect(find.text('Item was used'), findsOneWidget);
      expect(find.textContaining('Rejected Oct'), findsOneWidget);
      expect(find.textContaining('1 item rejected'), findsOneWidget);
    });
  });

  group('header status pill', () {
    testWidgets(
        'sits at the right edge of the header, not floating beside the title',
        (tester) async {
      await tester.pumpWidget(_card(_json(), onViewOrder: () {}));

      final card = tester.getRect(find.byKey(const ValueKey('refund-card-r1')));
      final label = tester.getRect(find.text('Refunded'));
      // Header padding (16) plus the pill's own padding (10): the label ends just inside the right edge.
      expect(card.right - label.right, lessThan(34));
    });

    testWidgets('shows the whole label, never cut off with an ellipsis',
        (tester) async {
      for (final width in [800.0, 375.0, 320.0]) {
        tester.view.physicalSize = Size(width, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(_card(
            _json(state: 'requested', extra: {'completedAt': null}),
            inOrder: true));
        await tester.pumpAndSettle();

        final paragraph = tester
            .renderObject<RenderParagraph>(find.text('Awaiting seller review'));
        expect(paragraph.didExceedMaxLines, isFalse, reason: 'at width $width');
        expect(tester.takeException(), isNull, reason: 'at width $width');
        final card =
            tester.getRect(find.byKey(const ValueKey('refund-card-r1')));
        final label = tester.getRect(find.text('Awaiting seller review'));
        expect(label.left, greaterThanOrEqualTo(card.left));
        expect(label.right, lessThanOrEqualTo(card.right));
      }
    });

    testWidgets('survives a long store name and large text', (tester) async {
      await tester.pumpWidget(_card(
          _json(extra: {
            'sellerName': 'A Seller Whose Store Name Is Also Rather Long Indeed'
          }),
          textScale: 2));
      await tester.pumpAndSettle();
      expect(find.text('Refunded'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('a rejected request', () {
    Map<String, dynamic> rejected() => _json(state: 'rejected', extra: {
          'completedAt': null,
          'decidedAt': '2026-10-19T03:00:00Z',
          'rejectionReason': 'Item was used'
        });

    testWidgets('puts the seller reason in its own readable block',
        (tester) async {
      await tester.pumpWidget(_card(rejected(), inOrder: true));

      expect(find.text('The seller rejected this request.'), findsOneWidget);
      expect(find.text('Seller’s reason'), findsOneWidget);
      expect(find.text('Item was used'), findsOneWidget);
      expect(find.text('Reason: Item was used'), findsNothing);
    });

    testWidgets('does not talk about a refund to the original payment method',
        (tester) async {
      await tester.pumpWidget(_card(rejected(), inOrder: true));

      expect(find.textContaining('original payment method'), findsNothing);
      expect(find.textContaining('Rejected Oct'), findsOneWidget);
    });

    testWidgets('a waiting request does not mention the payment method either',
        (tester) async {
      await tester.pumpWidget(_card(
          _json(state: 'requested', extra: {'completedAt': null}),
          inOrder: true));
      expect(find.textContaining('original payment method'), findsNothing);
    });

    testWidgets('a refunded request still says where the money goes',
        (tester) async {
      await tester.pumpWidget(_card(_json(), inOrder: true));
      expect(find.textContaining('original payment method'), findsOneWidget);
    });

    Color? amountColor(WidgetTester tester) =>
        tester.widget<Text>(find.text(r'$86.39')).style?.color;

    testWidgets('does not show the amount in the money-coming-back colour',
        (tester) async {
      await tester.pumpWidget(_card(rejected(), inOrder: true));
      expect(amountColor(tester), isNot(AppColors.primaryDark));

      await tester.pumpWidget(_card(_json(), inOrder: true));
      expect(amountColor(tester), AppColors.primaryDark);
    });

    testWidgets(
        'the Refund details title is dark enough to read, not brand orange',
        (tester) async {
      await tester.pumpWidget(_card(rejected(), inOrder: true));

      final title = tester.widget<Text>(find.text('Refund details'));
      expect(title.style?.color, isNotNull);
      expect(title.style?.color, isNot(AppColors.primary));
    });
  });

  group('Refund details row', () {
    testWidgets(
        'has its own icon and the chevron at the right edge, like the other expandable rows',
        (tester) async {
      await tester.pumpWidget(_card(_json(), inOrder: true));

      final row = tester.getRect(find
          .ancestor(
              of: find.text('Refund details'), matching: find.byType(InkWell))
          .first);
      final icon = tester.getRect(find.byIcon(Icons.receipt_long_outlined));
      final chevron = tester.getRect(find.byIcon(Icons.expand_more));
      expect(icon.left - row.left, lessThan(24));
      expect(row.right - chevron.right, lessThan(24));
      expect(chevron.right, greaterThan(icon.right + 100));
    });

    testWidgets('the chevron flips when it opens and the row reports expanded',
        (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(_card(_json(), inOrder: true));
      expect(find.byIcon(Icons.expand_less), findsNothing);

      await tester.tap(find.text('Refund details'));
      await tester.pump();

      expect(find.byIcon(Icons.expand_less), findsOneWidget);
      expect(find.byIcon(Icons.expand_more), findsNothing);
      handle.dispose();
    });
  });

  testWidgets(
      'View Details is the My Orders button: full width, brand outlined, and the Refund details row sits under it',
      (tester) async {
    tester.view.physicalSize = const Size(375, 812);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
            body: SingleChildScrollView(
                child: RefundOrderCard(
                    request: RefundRequestData.fromJson(_json()),
                    onViewOrder: () {})))));
    await tester.pumpAndSettle();

    final card = tester.getRect(find.byKey(const ValueKey('refund-card-r1')));
    final view =
        tester.getRect(find.widgetWithText(OutlinedButton, 'View Details'));
    // Across the card with 16 of padding on each side, like Track Order, at a normal button height.
    expect(view.width, closeTo(card.width - 32, 1));
    expect(view.height, lessThanOrEqualTo(56));
    final button = tester.widget<OutlinedButton>(
        find.widgetWithText(OutlinedButton, 'View Details'));
    expect(button.style?.foregroundColor?.resolve({}), AppColors.primary);
    // The details row is below the button and spans the card.
    final details = tester.getRect(find
        .ancestor(
            of: find.text('Refund details'), matching: find.byType(InkWell))
        .first);
    expect(details.top, greaterThanOrEqualTo(view.bottom));
    expect(details.width, closeTo(card.width, 1));
    expect(tester.takeException(), isNull);
  });
}
