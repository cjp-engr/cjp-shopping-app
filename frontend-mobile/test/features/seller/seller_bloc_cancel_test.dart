import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/features/seller/data/models/seller_order_model.dart';
import 'package:toko_mart/features/seller/domain/repositories/seller_repository.dart';
import 'package:toko_mart/features/seller/domain/seller_cancellation.dart';
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
        orders: orders ?? [sellerOrder(canSellerCancelPending: true)],
      );

  void stubCancel(Future<SellerCancelOutcome> Function() answer) {
    when(() => repo.cancelOrder(any(), any())).thenAnswer((_) => answer());
  }

  void stubReload(List<SellerOrderData> orders) {
    when(() => repo.getSellerOrders()).thenAnswer((_) async => orders);
  }

  group('cancelling a pending order', () {
    blocTest<SellerBloc, SellerState>(
      'a card cancellation reports the hold as being released and reloads the orders',
      setUp: () {
        stubCancel(() async => const SellerCancelOutcome(
            paymentOperation: SellerPaymentOperation.pending));
        stubReload([
          sellerOrder(
              status: 'cancelled',
              paymentStatus: 'release_pending',
              cancelledByRole: 'seller'),
        ]);
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc
          .add(const SellerOrderCancelRequested('order-1', 'Out of stock')),
      verify: (bloc) {
        final s = bloc.state;
        expect(s.orders.single.status, 'cancelled');
        expect(s.orders.single.paymentStatus, 'release_pending');
        expect(s.statusMessage, 'Order cancelled. The card hold is being released.');
        expect(s.statusMessageIsInfo, isTrue);
        expect(s.updatingOrderIds, isEmpty);
        verify(() => repo.cancelOrder('order-1', 'Out of stock')).called(1);
        verify(() => repo.getSellerOrders()).called(1);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a completed release says the hold was released',
      setUp: () {
        stubCancel(() async => const SellerCancelOutcome(
            paymentOperation: SellerPaymentOperation.completed));
        stubReload([sellerOrder(status: 'cancelled', paymentStatus: 'released')]);
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrderCancelRequested('order-1', 'x')),
      verify: (bloc) {
        expect(bloc.state.statusMessage, 'Order cancelled. The card hold was released.');
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a COD cancellation is a plain confirmation',
      setUp: () {
        stubCancel(() async => const SellerCancelOutcome());
        stubReload([sellerOrder(status: 'cancelled', paymentStatus: 'not_required')]);
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrderCancelRequested('order-1', 'x')),
      verify: (bloc) {
        expect(bloc.state.statusMessage, 'Order cancelled.');
        expect(bloc.state.statusMessageIsInfo, isTrue);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'losing the race shows the conflict message and reloads the real state',
      setUp: () {
        stubCancel(() async => throw const SellerOrderException('x',
            code: 'cancellation_conflict'));
        stubReload([sellerOrder(status: 'preparing', paymentStatus: 'captured')]);
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrderCancelRequested('order-1', 'x')),
      verify: (bloc) {
        final s = bloc.state;
        expect(s.statusMessage, contains('Refresh'));
        expect(s.statusMessageIsInfo, isFalse);
        expect(s.orders.single.status, 'preparing');
        expect(s.updatingOrderIds, isEmpty);
        verify(() => repo.getSellerOrders()).called(1);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'an unsupported order shows its message and reloads',
      setUp: () {
        stubCancel(() async => throw const SellerOrderException('x',
            code: 'cancellation_unavailable'));
        stubReload([sellerOrder()]);
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrderCancelRequested('order-1', 'x')),
      verify: (bloc) {
        expect(bloc.state.statusMessage, 'This order cannot be cancelled by the seller.');
        verify(() => repo.getSellerOrders()).called(1);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a fixable reason error shows its message without reloading',
      setUp: () {
        stubCancel(() async => throw const SellerOrderException('x',
            code: 'invalid_cancel_reason'));
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrderCancelRequested('order-1', 'x')),
      verify: (bloc) {
        expect(bloc.state.statusMessage, 'Enter a reason of 1 to 1000 characters.');
        expect(bloc.state.updatingOrderIds, isEmpty);
        verifyNever(() => repo.getSellerOrders());
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a transport error shows its own message',
      setUp: () {
        stubCancel(() async => throw 'No internet connection.');
      },
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrderCancelRequested('order-1', 'x')),
      verify: (bloc) {
        expect(bloc.state.statusMessage, 'No internet connection.');
        expect(bloc.state.statusMessageIsInfo, isFalse);
        expect(bloc.state.updatingOrderIds, isEmpty);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a blank reason never reaches the server',
      build: build,
      seed: seeded,
      act: (bloc) => bloc.add(const SellerOrderCancelRequested('order-1', '   ')),
      verify: (bloc) {
        expect(bloc.state.statusMessage, contains('reason'));
        expect(bloc.state.statusMessageIsInfo, isFalse);
        verifyNever(() => repo.cancelOrder(any(), any()));
      },
    );

    blocTest<SellerBloc, SellerState>(
      'a second request for the same order while one is in flight is ignored',
      setUp: () {
        final gate = Completer<SellerCancelOutcome>();
        when(() => repo.cancelOrder(any(), any())).thenAnswer((_) => gate.future);
        stubReload([sellerOrder(status: 'cancelled')]);
        addTearDown(() {
          if (!gate.isCompleted) gate.complete(const SellerCancelOutcome());
        });
      },
      build: build,
      seed: seeded,
      act: (bloc) async {
        bloc.add(const SellerOrderCancelRequested('order-1', 'x'));
        await Future<void>.delayed(Duration.zero);
        bloc.add(const SellerOrderCancelRequested('order-1', 'x'));
        await Future<void>.delayed(Duration.zero);
      },
      verify: (bloc) {
        expect(bloc.state.updatingOrderIds, contains('order-1'));
        verify(() => repo.cancelOrder('order-1', 'x')).called(1);
      },
    );

    blocTest<SellerBloc, SellerState>(
      'the previous notice is cleared when a new request starts',
      setUp: () {
        stubCancel(() async => const SellerCancelOutcome());
        stubReload([sellerOrder(status: 'cancelled')]);
      },
      build: build,
      seed: () => seeded().copyWith(
          statusMessage: 'Old notice', statusMessageIsInfo: false),
      act: (bloc) => bloc.add(const SellerOrderCancelRequested('order-1', 'x')),
      verify: (bloc) {
        expect(bloc.state.statusMessage, 'Order cancelled.');
      },
    );
  });

  group('other transitions keep their behavior', () {
    blocTest<SellerBloc, SellerState>(
      'cancelling a preparing COD order still uses the status update',
      setUp: () {
        when(() => repo.updateOrderStatus(any(), any(),
                cancelReason: any(named: 'cancelReason')))
            .thenAnswer((_) async => SellerStatusResult.completed);
      },
      build: build,
      seed: () => seeded([sellerOrder(status: 'preparing', paymentType: 'cash-on-delivery')]),
      act: (bloc) => bloc.add(const SellerOrderStatusUpdateRequested(
          'order-1', 'cancelled',
          cancelReason: 'x')),
      verify: (bloc) {
        expect(bloc.state.orders.single.status, 'cancelled');
        verify(() => repo.updateOrderStatus('order-1', 'cancelled',
            cancelReason: 'x')).called(1);
        verifyNever(() => repo.cancelOrder(any(), any()));
      },
    );
  });
}
