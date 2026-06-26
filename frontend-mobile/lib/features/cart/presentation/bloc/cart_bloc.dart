import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/cart_remote_datasource.dart';
import '../../domain/entities/cart_item_entity.dart';
import 'cart_event.dart';
import 'cart_state.dart';

class CartBloc extends Bloc<CartEvent, CartState> {
  final CartRemoteDataSource _remote;

  CartBloc(this._remote) : super(const CartState()) {
    on<CartLoadRequested>(_onLoad);
    on<CartItemAdded>(_onAdd);
    on<CartItemRemoved>(_onRemove);
    on<CartItemQuantityChanged>(_onQuantityChanged);
    on<CartCleared>(_onClear);
    on<CartItemsCheckedOut>(_onCheckedOut);
    on<CartServerUpdated>(_onServerUpdated);
  }

  // ── Load from server ──────────────────────────────────────────────────────

  Future<void> _onLoad(CartLoadRequested event, Emitter<CartState> emit) async {
    emit(state.copyWith(syncStatus: CartSyncStatus.syncing));
    try {
      final items = await _remote.getCart();
      emit(CartState(items: items, syncStatus: CartSyncStatus.idle));
    } catch (_) {
      emit(state.copyWith(syncStatus: CartSyncStatus.error));
    }
  }

  // ── Local mutations + background sync ────────────────────────────────────

  Future<void> _onAdd(CartItemAdded event, Emitter<CartState> emit) async {
    final existing = state.items.indexWhere(
        (i) => i.product.id == event.product.id);
    final List<CartItemEntity> updated;
    if (existing >= 0) {
      updated = List.from(state.items);
      updated[existing] =
          updated[existing].copyWith(quantity: updated[existing].quantity + event.quantity);
    } else {
      updated = [
        ...state.items,
        CartItemEntity(product: event.product, quantity: event.quantity),
      ];
    }
    emit(state.copyWith(items: updated));
    _syncInBackground(updated);
  }

  Future<void> _onRemove(CartItemRemoved event, Emitter<CartState> emit) async {
    final updated = state.items.where((i) => i.product.id != event.productId).toList();
    emit(state.copyWith(items: updated));
    _syncInBackground(updated);
  }

  Future<void> _onQuantityChanged(
      CartItemQuantityChanged event, Emitter<CartState> emit) async {
    if (event.quantity <= 0) {
      add(CartItemRemoved(event.productId));
      return;
    }
    final updated = state.items.map((i) {
      if (i.product.id == event.productId) return i.copyWith(quantity: event.quantity);
      return i;
    }).toList();
    emit(state.copyWith(items: updated));
    _syncInBackground(updated);
  }

  Future<void> _onClear(CartCleared event, Emitter<CartState> emit) async {
    emit(const CartState());
    try {
      await _remote.clearCart();
    } catch (_) {
      // Best-effort — order flow already succeeded
    }
  }

  Future<void> _onCheckedOut(
      CartItemsCheckedOut event, Emitter<CartState> emit) async {
    final remaining =
        state.items.where((i) => !event.productIds.contains(i.product.id)).toList();
    emit(state.copyWith(items: remaining));
    _syncInBackground(remaining);
  }

  void _onServerUpdated(CartServerUpdated event, Emitter<CartState> emit) {
    emit(state.copyWith(items: event.items, syncStatus: CartSyncStatus.idle));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  void _syncInBackground(List<CartItemEntity> items) {
    _remote.syncCart(items).then((serverItems) {
      add(CartServerUpdated(serverItems));
    }).catchError((_) {
      // Sync failed silently; local state is still valid
    });
  }
}
