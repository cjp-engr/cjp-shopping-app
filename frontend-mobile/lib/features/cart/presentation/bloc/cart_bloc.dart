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
    final newLabel = event.selectedVariant?.label ?? '';
    final existing = state.items.indexWhere(
      (i) => i.product.id == event.product.id &&
             (i.selectedVariant?.label ?? '') == newLabel,
    );
    final effectiveStock = event.selectedVariant?.stock ?? event.product.stock;
    if (effectiveStock <= 0) return;
    final List<CartItemEntity> updated;
    if (existing >= 0) {
      updated = List.from(state.items);
      final prev = updated[existing];
      updated[existing] = prev.copyWith(
        quantity: (prev.quantity + event.quantity).clamp(1, effectiveStock),
      );
    } else {
      updated = [
        ...state.items,
        CartItemEntity(
          product: event.product,
          quantity: event.quantity.clamp(1, effectiveStock),
          selectedVariant: event.selectedVariant,
        ),
      ];
    }
    emit(state.copyWith(items: updated));
    _syncInBackground(updated);
  }

  bool _matches(CartItemEntity i, String productId, String? variantLabel) {
    if (i.product.id != productId) return false;
    return variantLabel == null
        ? i.selectedVariant == null
        : (i.selectedVariant?.label ?? '') == variantLabel;
  }

  Future<void> _onRemove(CartItemRemoved event, Emitter<CartState> emit) async {
    final updated = state.items
        .where((i) => !_matches(i, event.productId, event.variantLabel))
        .toList();
    emit(state.copyWith(items: updated));
    _syncInBackground(updated);
  }

  Future<void> _onQuantityChanged(
      CartItemQuantityChanged event, Emitter<CartState> emit) async {
    if (event.quantity <= 0) {
      add(CartItemRemoved(event.productId, variantLabel: event.variantLabel));
      return;
    }
    final updated = state.items.map((i) {
      if (!_matches(i, event.productId, event.variantLabel)) return i;
      return i.copyWith(
        quantity: event.quantity.clamp(1, i.effectiveStock),
      );
    }).toList();
    emit(state.copyWith(items: updated));
    _syncInBackground(updated);
  }

  Future<void> _onClear(CartCleared event, Emitter<CartState> emit) {
    emit(const CartState());
    return Future.value();
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
