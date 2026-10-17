import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/seller_repository.dart';
import '../../domain/seller_acceptance.dart';
import '../../domain/seller_status_result.dart';
import 'seller_event.dart';
import 'seller_state.dart';

class SellerBloc extends Bloc<SellerEvent, SellerState> {
  final SellerRepository _repository;
  bool _silentLoadInFlight = false;
  int _silentReloadSequence = 0;

  SellerBloc(this._repository) : super(const SellerState()) {
    on<SellerProductsLoadRequested>(_onLoad);
    on<SellerProductCreateRequested>(_onCreate);
    on<SellerProductUpdateRequested>(_onUpdate);
    on<SellerProductDeleteRequested>(_onDelete);
    on<SellerOrdersLoadRequested>(_onLoadOrders);
    on<SellerOrderStatusUpdateRequested>(_onUpdateOrderStatus);
  }

  Future<void> _onLoad(
      SellerProductsLoadRequested event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerStatus.loading));
    try {
      final products = await _repository.getMyProducts();
      emit(state.copyWith(status: SellerStatus.success, products: products));
    } catch (e) {
      emit(state.copyWith(
          status: SellerStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onCreate(
      SellerProductCreateRequested event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerStatus.saving));
    try {
      final product = await _repository.createProduct(event.data,
          imagePaths: event.imagePaths);
      emit(state.copyWith(
        status: SellerStatus.success,
        products: [product, ...state.products],
      ));
    } catch (e) {
      emit(state.copyWith(
          status: SellerStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onUpdate(
      SellerProductUpdateRequested event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerStatus.saving));
    try {
      final updated = await _repository.updateProduct(event.id, event.data,
          imagePaths: event.imagePaths);
      final products =
          state.products.map((p) => p.id == event.id ? updated : p).toList();
      emit(state.copyWith(status: SellerStatus.success, products: products));
    } catch (e) {
      emit(state.copyWith(
          status: SellerStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onDelete(
      SellerProductDeleteRequested event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerStatus.saving));
    try {
      await _repository.deleteProduct(event.id);
      final products =
          state.products.where((p) => p.id != event.id).toList();
      emit(state.copyWith(status: SellerStatus.success, products: products));
    } catch (e) {
      emit(state.copyWith(
          status: SellerStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onLoadOrders(
      SellerOrdersLoadRequested event, Emitter<SellerState> emit) async {
    if (event.silent) {
      // Poll ticks must not pile up behind a slow request.
      if (_silentLoadInFlight) return;
      _silentLoadInFlight = true;
      try {
        await _refreshOrdersSilently(emit);
      } finally {
        _silentLoadInFlight = false;
      }
      return;
    }
    emit(state.copyWith(ordersStatus: SellerOrdersStatus.loading));
    try {
      final orders = await _repository.getSellerOrders();
      emit(state.copyWith(
          ordersStatus: SellerOrdersStatus.success, orders: orders));
    } catch (e) {
      emit(state.copyWith(
          ordersStatus: SellerOrdersStatus.failure,
          errorMessage: e.toString()));
    }
  }

  /// Background refresh: no loading state, and a failed request is ignored.
  /// Newest request wins: a response is dropped when a newer silent reload has
  /// started since, so an older snapshot can never overwrite a newer list.
  Future<void> _refreshOrdersSilently(Emitter<SellerState> emit) async {
    final sequence = ++_silentReloadSequence;
    try {
      final orders = await _repository.getSellerOrders();
      if (sequence != _silentReloadSequence) return;
      emit(state.copyWith(
          ordersStatus: SellerOrdersStatus.success, orders: orders));
    } catch (_) {}
  }

  void _release(String orderId, Emitter<SellerState> emit) {
    emit(state.copyWith(
        updatingOrderIds: {...state.updatingOrderIds}..remove(orderId)));
  }

  Future<void> _onUpdateOrderStatus(
      SellerOrderStatusUpdateRequested event,
      Emitter<SellerState> emit) async {
    // Accepting a card order charges the buyer, so one order never runs twice.
    if (state.updatingOrderIds.contains(event.orderId)) return;
    final isAccept = event.status == 'preparing';
    emit(state.copyWith(
      updatingOrderIds: {...state.updatingOrderIds, event.orderId},
      clearStatusMessage: true,
    ));
    try {
      final result = await _repository.updateOrderStatus(
          event.orderId, event.status,
          cancelReason: event.cancelReason);
      if (result == SellerStatusResult.resolving) {
        // The capture is still being resolved: the order stays as the server has it.
        emit(state.copyWith(
          statusMessage: captureResolvingMessage,
          statusMessageIsInfo: true,
        ));
        // Keep the order busy until the reload shows its capture state.
        await _refreshOrdersSilently(emit);
        _release(event.orderId, emit);
        return;
      }
      final updated = state.orders
          .map((o) => o.id == event.orderId ? o.copyWith(status: event.status) : o)
          .toList();
      emit(state.copyWith(
        orders: updated,
        updatingOrderIds: {...state.updatingOrderIds}..remove(event.orderId),
      ));
      if (isAccept) await _refreshOrdersSilently(emit);
    } catch (e) {
      if (isAccept) {
        final message = e is SellerOrderException
            ? acceptanceErrorMessage(e.code)
            : e.toString();
        emit(state.copyWith(
          statusMessage: message,
          statusMessageIsInfo: false,
        ));
        await _refreshOrdersSilently(emit);
        _release(event.orderId, emit);
      } else {
        emit(state.copyWith(
            updatingOrderIds: {...state.updatingOrderIds}
              ..remove(event.orderId),
            ordersStatus: SellerOrdersStatus.failure,
            errorMessage: e.toString()));
      }
    }
  }

  Future<String> uploadVariantImage(String filePath) =>
      _repository.uploadVariantImage(filePath);
}
