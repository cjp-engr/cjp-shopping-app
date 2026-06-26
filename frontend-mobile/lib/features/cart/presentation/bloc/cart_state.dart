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

  /// Shipping computed per seller group: $9.99 if that seller's subtotal < $50,
  /// else free. Pass optional per-seller discounts (keyed by sellerId).
  double shippingFor({Map<String, double> sellerDiscounts = const {}}) {
    if (items.isEmpty) return 0;
    final groups = <String, double>{};
    for (final item in items) {
      final key = item.product.sellerId ?? '__unknown__';
      groups[key] = (groups[key] ?? 0) + item.subtotal;
    }
    double total = 0;
    for (final entry in groups.entries) {
      final discount = sellerDiscounts[entry.key] ?? 0;
      final net = (entry.value - discount).clamp(0, double.infinity);
      if (net < 50) total += 9.99;
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
