import 'dart:math';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/refund_api.dart';
import '../data/refund_models.dart';

sealed class RefundEvent {}

class LoadRefunds extends RefundEvent {
  final int page;
  LoadRefunds({this.page = 1});
}

class SubmitRefund extends RefundEvent {
  final Map<String, int> quantities;
  final String reason, description;
  SubmitRefund(Map<String, int> quantities, this.reason, this.description)
      : quantities = Map.unmodifiable(quantities);
}

class DecideRefund extends RefundEvent {
  final String id, decision;
  final String? rejectionReason;
  DecideRefund(this.id, this.decision, [this.rejectionReason]);
}

class RefundState {
  final RefundEligibility? eligibility;
  final List<RefundRequestData> requests;
  final int page, pages, mutations;
  final bool busy, retryPending;
  final String? error;
  const RefundState(
      {this.eligibility,
      this.requests = const [],
      this.page = 1,
      this.pages = 0,
      this.mutations = 0,
      this.busy = false,
      this.retryPending = false,
      this.error});
  RefundState copyWith(
          {RefundEligibility? eligibility,
          List<RefundRequestData>? requests,
          int? page,
          int? pages,
          int? mutations,
          bool? busy,
          bool? retryPending,
          String? error}) =>
      RefundState(
          eligibility: eligibility ?? this.eligibility,
          requests:
              requests == null ? this.requests : List.unmodifiable(requests),
          page: page ?? this.page,
          pages: pages ?? this.pages,
          mutations: mutations ?? this.mutations,
          busy: busy ?? this.busy,
          retryPending: retryPending ?? this.retryPending,
          error: error);
}

class RefundBloc extends Bloc<RefundEvent, RefundState> {
  final RefundApi api;
  final String? orderId;
  bool _working = false;
  Map<String, dynamic>? _pending;
  RefundBloc(this.api, {this.orderId}) : super(const RefundState()) {
    on<RefundEvent>(_handle);
  }
  Future<RefundState> _load(int page) async {
    if (orderId != null) {
      final data = await Future.wait<Object>(
          [api.eligibility(orderId!), api.history(orderId!)]);
      return state.copyWith(
          eligibility: data[0] as RefundEligibility,
          requests: data[1] as List<RefundRequestData>);
    }
    final data = await api.sellerList(page);
    return state.copyWith(
        requests: data.requests, page: data.page, pages: data.pages);
  }

  Future<void> _handle(RefundEvent event, Emitter<RefundState> emit) async {
    if (_working) return;
    _working = true;
    emit(state.copyWith(busy: true));
    var saved = false;
    try {
      if (event is SubmitRefund) {
        if (orderId == null) {
          throw const RefundFailure('Select a buyer order first.');
        }
        if (_pending == null &&
            (event.description.trim().isEmpty ||
                event.description.trim().length > 1000 ||
                !refundReasons.containsKey(event.reason) ||
                event.quantities.isEmpty ||
                event.quantities.values.every((q) => q <= 0) ||
                event.quantities.values.any((q) => q < 0))) {
          throw const RefundFailure(
              'Select quantities and describe the issue.');
        }
        _pending ??= {
          'items': event.quantities.entries
              .where((e) => e.value > 0)
              .map((e) => {'lineId': e.key, 'quantity': e.value})
              .toList(),
          'reasonCode': event.reason,
          'description': event.description.trim(),
          'idempotencyKey': List.generate(
              16,
              (_) => Random.secure()
                  .nextInt(256)
                  .toRadixString(16)
                  .padLeft(2, '0')).join()
        };
        await api.submit(orderId!, _pending!);
        _pending = null;
        saved = true;
      } else if (event is DecideRefund) {
        if (!['approve', 'reject'].contains(event.decision) ||
            (event.decision == 'reject' &&
                (event.rejectionReason?.trim().isEmpty ?? true))) {
          throw const RefundFailure('Explain why the request is rejected.');
        }
        await api.decide(
            event.id, event.decision, event.rejectionReason?.trim());
        saved = true;
      }
      final loaded =
          await _load(event is LoadRefunds ? event.page : state.page);
      emit(loaded.copyWith(
          busy: false,
          retryPending: _pending != null,
          mutations: state.mutations + (saved ? 1 : 0)));
    } catch (e) {
      if (event is SubmitRefund && e is RefundFailure && !e.uncertain) {
        _pending = null;
      }
      emit(state.copyWith(
          busy: false,
          retryPending: _pending != null,
          mutations: state.mutations + (saved ? 1 : 0),
          error: saved
              ? 'Decision or request saved. Refresh to see its current status.'
              : e is RefundFailure
                  ? e.message
                  : 'Could not complete the request. Refresh before retrying.'));
    } finally {
      _working = false;
    }
  }
}
