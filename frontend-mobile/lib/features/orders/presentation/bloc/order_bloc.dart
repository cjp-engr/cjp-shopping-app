import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/order_repository.dart';
import 'order_event.dart';
import 'order_state.dart';

class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final OrderRepository _repository;

  OrderBloc(this._repository) : super(const OrderState()) {
    on<OrdersLoadRequested>(_onLoad);
    on<OrderCreateRequested>(_onCreate);
    on<OrderCancelRequested>(_onCancel);
  }

  Future<void> _onLoad(
      OrdersLoadRequested event, Emitter<OrderState> emit) async {
    emit(state.copyWith(status: OrderStatus.loading));
    try {
      final orders = await _repository.getOrders(event.userId);
      emit(state.copyWith(status: OrderStatus.success, orders: orders));
    } catch (e) {
      emit(state.copyWith(
          status: OrderStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onCreate(
      OrderCreateRequested event, Emitter<OrderState> emit) async {
    emit(state.copyWith(status: OrderStatus.placing));
    try {
      final order = await _repository.createOrder(event.orderData);
      emit(state.copyWith(
          status: OrderStatus.placed,
          placedOrder: order,
          orders: [order, ...state.orders]));
    } catch (e) {
      emit(state.copyWith(
          status: OrderStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onCancel(
      OrderCancelRequested event, Emitter<OrderState> emit) async {
    try {
      final updated =
          await _repository.cancelOrder(event.orderId, event.userId);
      final orders = state.orders
          .map((o) => o.id == updated.id ? updated : o)
          .toList();
      emit(state.copyWith(status: OrderStatus.success, orders: orders));
    } catch (e) {
      emit(state.copyWith(
          status: OrderStatus.failure, errorMessage: e.toString()));
    }
  }
}
