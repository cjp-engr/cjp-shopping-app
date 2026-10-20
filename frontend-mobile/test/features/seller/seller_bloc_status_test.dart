import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/features/seller/data/models/seller_order_model.dart';
import 'package:toko_mart/features/seller/domain/repositories/seller_repository.dart';
import 'package:toko_mart/features/seller/domain/seller_status_result.dart';
import 'package:toko_mart/features/seller/presentation/bloc/seller_bloc.dart';
import 'package:toko_mart/features/seller/presentation/bloc/seller_event.dart';
import 'package:toko_mart/features/seller/presentation/bloc/seller_state.dart';

import 'seller_test_data.dart';

class MockSellerRepository extends Mock implements SellerRepository {}

void main() {
  late MockSellerRepository repo;

  setUp(() {
    repo = MockSellerRepository();
  });

  SellerBloc build() => SellerBloc(repo);

  SellerState seeded([List<SellerOrderData>? orders]) => SellerState(
        ordersStatus: SellerOrdersStatus.success,
        orders: orders ?? [sellerOrder()],
      );

  void stubUpdate(Future<SellerStatusResult> Function() answer) {
    when(() => repo.updateOrderStatus(any(), any(),
        cancelReason: any(named: 'cancelReason'))).thenAnswer((_) => answer());
  }

  group('accepting a pending order', () {
    blocTest<SellerBloc, SellerState>(
      'completed applies preparing locally and reloads orders',
      setUp: () {
        stubUpdate(() async => SellerStatusResult.completed);
        when(() => repo.getSellerOrders())
            .thenAnswer((_) async => [sellerOrder(status: 'preparing')]);
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc
          .add(const SellerOrderStatusUpdateRequested('order-1', 'preparing')),
      verify: (bloc) {
        expect(bloc.state.orders.single.status, 'preparing');
        expect(bloc.state.statusMessage, isNull);
        expect(bloc.state.updatingOrderIds, isEmpty);
        verify(() => repo.getSellerOrders()).called(1);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'resolving shows the info message, keeps pending and reloads',
      setUp: () {
        stubUpdate(() async => SellerStatusResult.resolving);
        when(() => repo.getSellerOrders()).thenAnswer(
            (_) async => [sellerOrder(paymentStatus: 'capture_pending')]);
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc
          .add(const SellerOrderStatusUpdateRequested('order-1', 'preparing')),
      verify: (bloc) {
        final s = bloc.state;
        expect(s.orders.single.status, 'pending');
        expect(s.orders.single.paymentStatus, 'capture_pending');
        expect(s.statusMessage,
            'Payment is being charged. This order will move to preparing when it finishes.');
        expect(s.statusMessageIsInfo, isTrue);
        expect(s.updatingOrderIds, isEmpty);
        verify(() => repo.getSellerOrders()).called(1);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'resolving never emits an order that shows preparing',
      setUp: () {
        stubUpdate(() async => SellerStatusResult.resolving);
        when(() => repo.getSellerOrders()).thenAnswer(
            (_) async => [sellerOrder(paymentStatus: 'capture_pending')]);
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc
          .add(const SellerOrderStatusUpdateRequested('order-1', 'preparing')),
      expect: () => everyElement(isA<SellerState>().having(
          (s) => s.orders.every((o) => o.status == 'pending'),
          'all orders pending',
          isTrue)),
    );

    for (final entry in {
      'capture_failed':
          'The payment could not be charged. Try accepting again.',
      'acceptance_deadline_passed':
          'The acceptance window for this order has ended.',
      'unmapped_code': 'Could not accept the order. Please try again.',
    }.entries) {
      blocTest<SellerBloc, SellerState>(
        '${entry.key} emits its mapped error message and reloads orders',
        setUp: () {
          stubUpdate(() async =>
              throw SellerOrderException('server text', code: entry.key));
          when(() => repo.getSellerOrders())
              .thenAnswer((_) async => [sellerOrder()]);
        },
        build: build,
        seed: seeded,
        act: (bloc) => bloc.add(
            const SellerOrderStatusUpdateRequested('order-1', 'preparing')),
        verify: (bloc) {
          expect(bloc.state.statusMessage, entry.value);
          expect(bloc.state.statusMessageIsInfo, isFalse);
          expect(bloc.state.orders.single.status, 'pending');
          expect(bloc.state.updatingOrderIds, isEmpty);
          // the failure must not flip the list into its error state
          expect(bloc.state.ordersStatus, SellerOrdersStatus.success);
          verify(() => repo.getSellerOrders()).called(1);
        },
      );
    }

    blocTest<SellerBloc, SellerState>(
      'a failed reload after an error keeps the message and the list',
      setUp: () {
        stubUpdate(() async =>
            throw const SellerOrderException('x', code: 'capture_failed'));
        when(() => repo.getSellerOrders()).thenThrow(Exception('offline'));
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc
          .add(const SellerOrderStatusUpdateRequested('order-1', 'preparing')),
      verify: (bloc) {
        expect(bloc.state.statusMessage,
            'The payment could not be charged. Try accepting again.');
        expect(bloc.state.orders, hasLength(1));
        expect(bloc.state.ordersStatus, SellerOrdersStatus.success);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'ignores a second accept for the same order while one is in flight',
      setUp: () {
        stubUpdate(() async {
          await Future<void>.delayed(const Duration(milliseconds: 20));
          return SellerStatusResult.completed;
        });
        when(() => repo.getSellerOrders())
            .thenAnswer((_) async => [sellerOrder(status: 'preparing')]);
      },
      build: build,
      seed: seeded,
      act: (bloc) {
        bloc.add(
            const SellerOrderStatusUpdateRequested('order-1', 'preparing'));
        bloc.add(
            const SellerOrderStatusUpdateRequested('order-1', 'preparing'));
      },
      wait: const Duration(milliseconds: 100),
      verify: (_) {
        verify(() => repo.updateOrderStatus('order-1', 'preparing',
            cancelReason: any(named: 'cancelReason'))).called(1);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'clears a stale message when the next request starts',
      setUp: () {
        stubUpdate(() async => SellerStatusResult.completed);
        when(() => repo.getSellerOrders())
            .thenAnswer((_) async => [sellerOrder(status: 'preparing')]);
      },
      build: build,
      seed: () =>
          seeded().copyWith(statusMessage: 'old', statusMessageIsInfo: false),
      act: (bloc) => bloc
          .add(const SellerOrderStatusUpdateRequested('order-1', 'preparing')),
      verify: (bloc) {
        expect(bloc.state.statusMessage, isNull);
      },
    );
  });

  group('other transitions are unchanged', () {
    blocTest<SellerBloc, SellerState>(
      'processing applies locally without reloading',
      setUp: () => stubUpdate(() async => SellerStatusResult.completed),
      build: build,
      seed: () => seeded([sellerOrder(status: 'preparing')]),
      act: (bloc) => bloc
          .add(const SellerOrderStatusUpdateRequested('order-1', 'processing')),
      verify: (bloc) {
        expect(bloc.state.orders.single.status, 'processing');
        verifyNever(() => repo.getSellerOrders());
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a failed non-accept transition keeps the existing failure state',
      setUp: () => stubUpdate(() async => throw Exception('boom')),
      build: build,
      seed: () => seeded([sellerOrder(status: 'preparing')]),
      act: (bloc) => bloc
          .add(const SellerOrderStatusUpdateRequested('order-1', 'processing')),
      verify: (bloc) {
        expect(bloc.state.ordersStatus, SellerOrdersStatus.failure);
        expect(bloc.state.errorMessage, contains('boom'));
      },
    );
  });

  group('silent order reload', () {
    blocTest<SellerBloc, SellerState>(
      'refreshes the list without toggling the loading status',
      setUp: () => when(() => repo.getSellerOrders())
          .thenAnswer((_) async => [sellerOrder(status: 'preparing')]),
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrdersLoadRequested(silent: true)),
      expect: () => [
        isA<SellerState>()
            .having((s) => s.ordersStatus, 'status', SellerOrdersStatus.success)
            .having((s) => s.orders.single.status, 'order', 'preparing'),
      ],
    );

    blocTest<SellerBloc, SellerState>(
      'ignores a failed silent tick',
      setUp: () =>
          when(() => repo.getSellerOrders()).thenThrow(Exception('offline')),
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrdersLoadRequested(silent: true)),
      expect: () => <SellerState>[],
    );
  });

  group('overlapping silent reloads (newest response wins)', () {
    late List<Completer<List<SellerOrderData>>> reloads;

    Future<void> settle() => Future<void>.delayed(Duration.zero);

    setUp(() {
      reloads = [];
      when(() => repo.getSellerOrders()).thenAnswer((_) {
        final completer = Completer<List<SellerOrderData>>();
        reloads.add(completer);
        return completer.future;
      });
      stubUpdate(() async => SellerStatusResult.completed);
    });

    final stalePending = [sellerOrder()];
    final freshPreparing = [sellerOrder(status: 'preparing')];

    blocTest<SellerBloc, SellerState>(
      'a poll tick that resolves after the post-accept reload does not overwrite it',
      build: build,
      seed: seeded,
      act: (bloc) async {
        bloc.add(const SellerOrdersLoadRequested(silent: true)); // older tick
        await settle();
        bloc.add(
            const SellerOrderStatusUpdateRequested('order-1', 'preparing'));
        await settle();
        expect(reloads, hasLength(2));
        reloads[1].complete(freshPreparing); // post-accept reload
        await settle();
        reloads[0].complete(stalePending); // stale tick arrives last
        await settle();
      },
      verify: (bloc) {
        expect(bloc.state.orders.single.status, 'preparing');
        expect(bloc.state.updatingOrderIds, isEmpty);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'the post-accept reload still runs and applies while a poll tick is in flight',
      build: build,
      seed: seeded,
      act: (bloc) async {
        bloc.add(const SellerOrdersLoadRequested(silent: true));
        await settle();
        bloc.add(
            const SellerOrderStatusUpdateRequested('order-1', 'preparing'));
        await settle();
        reloads[1].complete(freshPreparing);
        await settle();
        // the tick is still unresolved here
        expect(reloads[0].isCompleted, isFalse);
        expect(bloc.state.orders.single.status, 'preparing');
        expect(bloc.state.updatingOrderIds, isEmpty);
      },
      verify: (_) {
        verify(() => repo.getSellerOrders()).called(2);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a stale response is dropped even when the newer reload is a resolving accept',
      build: build,
      seed: seeded,
      act: (bloc) async {
        stubUpdate(() async => SellerStatusResult.resolving);
        bloc.add(const SellerOrdersLoadRequested(silent: true));
        await settle();
        bloc.add(
            const SellerOrderStatusUpdateRequested('order-1', 'preparing'));
        await settle();
        reloads[1].complete([sellerOrder(paymentStatus: 'capture_pending')]);
        await settle();
        reloads[0].complete(stalePending);
        await settle();
      },
      verify: (bloc) {
        expect(bloc.state.orders.single.paymentStatus, 'capture_pending');
        expect(bloc.state.orders.single.status, 'pending');
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a second poll tick while one is in flight is dropped',
      build: build,
      seed: seeded,
      act: (bloc) async {
        bloc.add(const SellerOrdersLoadRequested(silent: true));
        await settle();
        bloc.add(const SellerOrdersLoadRequested(silent: true));
        await settle();
        expect(reloads, hasLength(1));
        reloads[0].complete(freshPreparing);
        await settle();
        bloc.add(const SellerOrdersLoadRequested(silent: true));
        await settle();
        expect(reloads, hasLength(2)); // a new tick is accepted once idle
        reloads[1].complete(freshPreparing);
        await settle();
      },
      verify: (bloc) {
        expect(bloc.state.orders.single.status, 'preparing');
      },
    );
  });
}
