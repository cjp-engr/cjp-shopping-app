import 'package:equatable/equatable.dart';
import '../../domain/entities/cart_item_entity.dart';

enum CartSyncStatus { idle, syncing, error }

class CartState extends Equatable {
  final List<CartItemEntity> items;
  final CartSyncStatus syncStatus;

  const CartState({
    this.items = const [],
    this.syncStatus = CartSyncStatus.idle,
  });

  int get itemCount => items.length;
  int get totalQuantity => items.fold(0, (s, i) => s + i.quantity);
  double get subtotal => items.fold(0, (s, i) => s + i.subtotal);

  /// Shipping computed per seller group, respecting each seller's configured
  /// shippingFee. 'free' → $0; 'buyer_pays' → resolved at checkout; no config → $0.
  /// Pass optional per-seller discounts (keyed by sellerId).
  double shippingFor({Map<String, double> sellerDiscounts = const {}}) {
    if (items.isEmpty) return 0;
    final groups = <String, String?>{};
    for (final item in items) {
      final key = item.product.sellerId ?? '__unknown__';
      groups[key] ??= item.product.shippingFee;
    }
    double total = 0;
    for (final entry in groups.entries) {
      if (entry.value == 'free') continue;
      // 'buyer_pays' and unknown are resolved at checkout
    }
    return total;
  }

  // Convenience getters (no discounts applied) — used by cart screen before
  // per-seller discounts are known.
  double get shipping => shippingFor();
  double get tax => subtotal * 0.08;
  double get total => subtotal + shipping + tax;
  bool get freeShipping => shipping == 0;

  CartState copyWith({
    List<CartItemEntity>? items,
    CartSyncStatus? syncStatus,
  }) =>
      CartState(
        items: items ?? this.items,
        syncStatus: syncStatus ?? this.syncStatus,
      );

  @override
  List<Object?> get props => [items, syncStatus];
}
