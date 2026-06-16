import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/cart_item_entity.dart';
import 'cart_event.dart';
import 'cart_state.dart';

class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc() : super(const CartState()) {
    on<CartItemAdded>(_onAdd);
    on<CartItemRemoved>(_onRemove);
    on<CartItemQuantityChanged>(_onQuantityChanged);
    on<CartCleared>(_onClear);
  }

  void _onAdd(CartItemAdded event, Emitter<CartState> emit) {
    final existing = state.items.indexWhere(
        (i) => i.product.id == event.product.id);
    if (existing >= 0) {
      final updated = List<CartItemEntity>.from(state.items);
      updated[existing] = updated[existing].copyWith(
          quantity: updated[existing].quantity + event.quantity);
      emit(CartState(items: updated));
    } else {
      emit(CartState(items: [
        ...state.items,
        CartItemEntity(product: event.product, quantity: event.quantity)
      ]));
    }
  }

  void _onRemove(CartItemRemoved event, Emitter<CartState> emit) {
    emit(CartState(
        items: state.items
            .where((i) => i.product.id != event.productId)
            .toList()));
  }

  void _onQuantityChanged(
      CartItemQuantityChanged event, Emitter<CartState> emit) {
    if (event.quantity <= 0) {
      add(CartItemRemoved(event.productId));
      return;
    }
    final updated = state.items.map((i) {
      if (i.product.id == event.productId) {
        return i.copyWith(quantity: event.quantity);
      }
      return i;
    }).toList();
    emit(CartState(items: updated));
  }

  void _onClear(CartCleared event, Emitter<CartState> emit) {
    emit(const CartState());
  }
}
