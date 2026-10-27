import 'package:equatable/equatable.dart';
import '../../../../core/utils/seller_shipping.dart';
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
  /// shippingFee. 'free' → $0; 'buyer_pays' → resolved via deliverySelections.
  /// Pass optional per-seller discounts (keyed by sellerId) and delivery selections.
  double shippingFor({
    Map<String, double> sellerDiscounts = const {},
    Map<String, String> deliverySelections = const {},
  }) {
    if (items.isEmpty) return 0;
    final groups = <String, List<CartItemEntity>>{};
    for (final item in items) {
      final key = item.product.sellerId ?? '__unknown__';
      groups.putIfAbsent(key, () => []);
      groups[key]!.add(item);
    }
    double total = 0;
    for (final entry in groups.entries) {
      final sellerKey = entry.key;
      final items = entry.value;
      if (items.isEmpty) continue;

      final firstItem = items.first;
      final shippingFee = firstItem.product.shippingFee;
      if (shippingFee == 'free') continue;

      if (shippingFee != 'buyer_pays') {
        // The seller set no shipping fee: the flat default applies
        total += defaultShippingFee;
        continue;
      }

      // For 'buyer_pays', use the selected delivery option
      final selectedOption = deliverySelections[sellerKey];
      if (selectedOption != null) {
        total += sellerShippingFee(
          shippingFee: shippingFee,
          shippingFeeAmounts: firstItem.product.shippingFeeAmounts,
          selectedOption: selectedOption,
        );
      }
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
