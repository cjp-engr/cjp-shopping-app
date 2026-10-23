import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/core/theme/app_theme.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/refunds/presentation/completed_refunds.dart';
import 'package:toko_mart/features/refunds/presentation/refund_components.dart';
import 'package:toko_mart/features/refunds/presentation/refund_review_panel.dart';

class MockRefundApi extends Mock implements RefundApi {}

Map<String, dynamic> _request(String id, String state, {String? buyer}) => {
      'id': id,
      'orderId': '6ad4d9ac$id',
      'state': state,
      'canDecide': state == 'requested',
      'amountMinor': 1080,
      'currency': 'usd',
      'reasonCode': 'damaged',
      'description': 'Broken',
      'buyerName': buyer ?? 'Buyer $id',
      'sellerName': 'Seller $id',
      'units': [
        {
          'lineId': 'a',
          'ordinal': 1,
          'productName': 'Mug $id',
          'merchandiseMinor': 1000,
          'taxMinor': 80
        }
      ],
    };

SellerRefundPage _page(int page, int pages, List<Map<String, dynamic>> requests,
        {Map<String, int>? counts}) =>
    SellerRefundPage.fromJson({
      'page': page,
      'pages': pages,
      'total': requests.length,
      'counts': counts ?? {'in_progress': 6, 'approved': 0, 'rejected': 0},
      'requests': requests,
    });

Future<void> _scrollToEnd(WidgetTester tester) async {
  await tester.drag(find.byType(ListView), const Offset(0, -4000));
  await tester.pumpAndSettle();
}

void main() {
  late MockRefundApi api;
  setUp(() => api = MockRefundApi());

  group('buyer Return/Refund tab', () {
    Future<void> pump(WidgetTester tester) async {
      await tester.pumpWidget(MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(body: CompletedRefunds(api: api))));
      await tester.pumpAndSettle();
    }

    testWidgets('does not ask for another page when there is only one',
        (tester) async {
      when(() => api.completed(1))
          .thenAnswer((_) async => _page(1, 1, [_request('1', 'refunded')]));
      await pump(tester);
      await _scrollToEnd(tester);

      verify(() => api.completed(1)).called(1);
      verifyNever(() => api.completed(2));
      expect(find.text('Mug 1'), findsOneWidget);
    });

    testWidgets(
        'a page that was still loading when the list was refreshed is dropped, and the next page is asked for again',
        (tester) async {
      final firstPages = [
        _page(1, 2, [_request('1', 'refunded')]),
        _page(1, 2, [_request('fresh1', 'refunded')]),
      ];
      when(() => api.completed(1))
          .thenAnswer((_) async => firstPages.removeAt(0));
      final stale = Completer<SellerRefundPage>();
      final secondPages = <Future<SellerRefundPage>>[
        stale.future,
        Future.value(_page(2, 2, [_request('fresh2', 'refunded')])),
      ];
      when(() => api.completed(2)).thenAnswer((_) => secondPages.removeAt(0));
      // A pending request keeps the spinner animating, so the test pumps by hand instead of settling.
      Future<void> settle() async {
        for (var i = 0; i < 5; i++) {
          await tester.pump(const Duration(milliseconds: 100));
        }
      }

      await tester.pumpWidget(MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(body: CompletedRefunds(api: api))));
      await settle(); // page 1 shows; page 2 is asked for and is slow

      await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
      await settle();
      await settle();
      stale.complete(_page(2, 2, [_request('stale2', 'refunded')]));
      await settle();

      expect(find.text('Mug stale2'), findsNothing);
      expect(find.text('Mug fresh1'), findsOneWidget);
      expect(find.text('Mug fresh2'), findsOneWidget);
      verify(() => api.completed(2)).called(2);
    });

    testWidgets(
        'has no refresh button: the list is refreshed by pulling it down',
        (tester) async {
      when(() => api.completed(1))
          .thenAnswer((_) async => _page(1, 1, [_request('1', 'refunded')]));
      await pump(tester);

      expect(find.byIcon(Icons.refresh), findsNothing);
      expect(find.byTooltip('Refresh refunds'), findsNothing);

      when(() => api.completed(1))
          .thenAnswer((_) async => _page(1, 1, [_request('2', 'refunded')]));
      await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
      await tester.pumpAndSettle();

      verify(() => api.completed(1)).called(2);
      expect(find.text('Mug 2'), findsOneWidget);
      expect(find.text('Mug 1'), findsNothing);
    });

    testWidgets('keeps loading pages until the end, each only once',
        (tester) async {
      when(() => api.completed(1))
          .thenAnswer((_) async => _page(1, 3, [_request('1', 'refunded')]));
      when(() => api.completed(2))
          .thenAnswer((_) async => _page(2, 3, [_request('2', 'refunded')]));
      when(() => api.completed(3))
          .thenAnswer((_) async => _page(3, 3, [_request('3', 'processing')]));
      await pump(tester);
      for (var i = 0; i < 3; i++) {
        await _scrollToEnd(tester);
      }

      verify(() => api.completed(2)).called(1);
      verify(() => api.completed(3)).called(1);
      verifyNever(() => api.completed(4));
      expect(find.text('Mug 3'), findsOneWidget);
    });

    testWidgets(
        'a failed page load can be retried without losing what is shown',
        (tester) async {
      when(() => api.completed(1))
          .thenAnswer((_) async => _page(1, 2, [_request('1', 'refunded')]));
      var calls = 0;
      when(() => api.completed(2)).thenAnswer((_) async {
        calls++;
        if (calls == 1) throw Exception('offline');
        return _page(2, 2, [_request('2', 'refunded')]);
      });
      await pump(tester);
      await _scrollToEnd(tester);

      expect(find.text('Mug 1'), findsOneWidget);
      expect(find.text('Could not load more. Tap to retry.'), findsOneWidget);

      await tester.tap(find.text('Could not load more. Tap to retry.'));
      await tester.pumpAndSettle();
      await _scrollToEnd(tester);

      expect(find.text('Mug 2'), findsOneWidget);
      expect(find.text('Mug 1'), findsOneWidget);
    });

    testWidgets('has no pagination controls', (tester) async {
      when(() => api.completed(1))
          .thenAnswer((_) async => _page(1, 2, [_request('1', 'refunded')]));
      when(() => api.completed(2))
          .thenAnswer((_) async => _page(2, 2, [_request('2', 'refunded')]));
      await pump(tester);
      await _scrollToEnd(tester);

      expect(find.text('Previous'), findsNothing);
      expect(find.text('Next'), findsNothing);
      expect(find.textContaining('Page '), findsNothing);
    });

    testWidgets('says what the tab is for in one short line', (tester) async {
      when(() => api.completed(1))
          .thenAnswer((_) async => _page(1, 1, [_request('1', 'refunded')]));
      await pump(tester);

      expect(find.text('Refunds your sellers have approved.'), findsOneWidget);
      expect(find.textContaining('stay with your order under Completed'),
          findsOneWidget);
    });
  });

  group('seller Return/Refund list', () {
    Future<void> pump(WidgetTester tester) async {
      await tester.pumpWidget(MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(body: RefundReviewList(api: api))));
      await tester.pumpAndSettle();
    }

    testWidgets(
        'has no refresh button: the list is refreshed by pulling it down',
        (tester) async {
      when(() => api.sellerList(1, 'in_progress')).thenAnswer((_) async =>
          _page(1, 1, [_request('a0', 'requested', buyer: 'Before Pull')]));
      await pump(tester);

      expect(find.byIcon(Icons.refresh), findsNothing);
      expect(find.byTooltip('Refresh refund requests'), findsNothing);
      expect(find.byType(RefreshIndicator), findsOneWidget);

      when(() => api.sellerList(1, 'in_progress')).thenAnswer((_) async =>
          _page(1, 1, [_request('a1', 'requested', buyer: 'After Pull')]));
      await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
      await tester.pumpAndSettle();

      verify(() => api.sellerList(1, 'in_progress')).called(2);
      expect(find.text('After Pull'), findsOneWidget);
      expect(find.text('Before Pull'), findsNothing);
    });

    testWidgets(
        'pulling down reloads the group that is open, not the first one',
        (tester) async {
      when(() => api.sellerList(1, 'in_progress'))
          .thenAnswer((_) async => _page(1, 1, [_request('a0', 'requested')]));
      when(() => api.sellerList(1, 'approved')).thenAnswer((_) async =>
          _page(1, 1, [_request('p0', 'processing', buyer: 'Approved Buyer')]));
      await pump(tester);
      await tester.tap(find.byKey(const ValueKey('refund-group-approved')));
      await tester.pumpAndSettle();

      await tester.fling(find.byType(ListView), const Offset(0, 400), 1000);
      await tester.pumpAndSettle();

      verify(() => api.sellerList(1, 'approved')).called(2);
      verify(() => api.sellerList(1, 'in_progress')).called(1);
      expect(find.text('Approved Buyer'), findsOneWidget);
    });

    for (final (width, textScale) in [
      (375.0, 1.0),
      (320.0, 1.0),
      (375.0, 1.6)
    ]) {
      testWidgets(
          'the three group chips share one line and one size at width $width, text x$textScale',
          (tester) async {
        tester.view.physicalSize = Size(width, 812);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        when(() => api.sellerList(1, 'in_progress')).thenAnswer((_) async =>
            _page(1, 1, [_request('a0', 'requested')],
                counts: {'in_progress': 0, 'approved': 4, 'rejected': 2}));
        await tester.pumpWidget(MaterialApp(
            theme: AppTheme.light,
            home: MediaQuery(
                data: MediaQueryData(
                    size: Size(width, 812),
                    textScaler: TextScaler.linear(textScale)),
                child: Scaffold(body: RefundReviewList(api: api)))));
        await tester.pumpAndSettle();

        final chips = [
          for (final key in ['in_progress', 'approved', 'rejected'])
            tester.getRect(find.byKey(ValueKey('refund-group-$key')))
        ];
        expect(chips.map((c) => c.top).toSet().length, 1,
            reason: 'all three on one line: $chips');
        expect(chips.map((c) => c.width.round()).toSet().length, 1,
            reason: 'equal widths: $chips');
        expect(chips.last.right, lessThanOrEqualTo(width - 16 + 0.5));
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets(
        'loads the next page as you scroll and shows no pagination controls',
        (tester) async {
      when(() => api.sellerList(1, 'in_progress')).thenAnswer((_) async =>
          _page(1, 2,
              [for (var i = 0; i < 3; i++) _request('a$i', 'requested')]));
      when(() => api.sellerList(2, 'in_progress')).thenAnswer((_) async =>
          _page(2, 2, [_request('b0', 'requested', buyer: 'Late Buyer')]));
      await pump(tester);

      expect(find.text('Previous'), findsNothing);
      expect(find.text('Next'), findsNothing);
      expect(find.text('Late Buyer'), findsNothing);

      await _scrollToEnd(tester);
      await _scrollToEnd(tester);

      verify(() => api.sellerList(2, 'in_progress')).called(1);
      expect(find.text('Late Buyer'), findsOneWidget);
      await tester.drag(find.byType(ListView), const Offset(0, 4000));
      await tester.pumpAndSettle();
      expect(find.text('Buyer a0'), findsOneWidget);
      expect(find.textContaining('Page '), findsNothing);
    });
  });

  group('refund policy tile', () {
    Future<void> pump(WidgetTester tester) async {
      await tester.pumpWidget(MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
              body: SingleChildScrollView(
                  child: RefundPolicy(
                      deliveredAt: DateTime.utc(2026, 10, 19, 13, 52))))));
      await tester.pumpAndSettle();
    }

    testWidgets('starts closed and opens to a short list of rules',
        (tester) async {
      await pump(tester);
      expect(find.text('Refund policy & shipping'), findsOneWidget);
      expect(find.textContaining('seven days'), findsNothing);

      await tester.tap(find.text('Refund policy & shipping'));
      await tester.pumpAndSettle();

      expect(find.text('Request within seven days of recorded delivery.'),
          findsOneWidget);
      expect(
          find.text('Seller approval starts the refund. No return is needed.'),
          findsOneWidget);
      expect(find.textContaining('Shipping is refunded only when'),
          findsOneWidget);
      expect(find.textContaining('Change of mind'), findsOneWidget);
      expect(find.textContaining('Delivered Oct 19'), findsOneWidget);
    });

    testWidgets('closes again', (tester) async {
      await pump(tester);
      await tester.tap(find.text('Refund policy & shipping'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Refund policy & shipping'));
      await tester.pumpAndSettle();

      expect(find.textContaining('seven days'), findsNothing);
    });
  });
}
