import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product_entity.dart';
import '../../domain/entities/cart_item_entity.dart';

sealed class CartEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

/// Load cart from the remote server (on login / app start).
final class CartLoadRequested extends CartEvent {}

final class CartItemAdded extends CartEvent {
  final ProductEntity product;
  final int quantity;
  final ProductVariant? selectedVariant;
  CartItemAdded({required this.product, this.quantity = 1, this.selectedVariant});

  @override
  List<Object?> get props => [product.id, selectedVariant?.label, quantity];
}

final class CartItemRemoved extends CartEvent {
  final String productId;
  final String? variantLabel;
  CartItemRemoved(this.productId, {this.variantLabel});

  @override
  List<Object?> get props => [productId, variantLabel];
}

final class CartItemQuantityChanged extends CartEvent {
  final String productId;
  final int quantity;
  final String? variantLabel;
  CartItemQuantityChanged(this.productId, this.quantity, {this.variantLabel});

  @override
  List<Object?> get props => [productId, variantLabel, quantity];
}

final class CartCleared extends CartEvent {}

/// Remove only the given product IDs (checked-out items), keep the rest.
final class CartItemsCheckedOut extends CartEvent {
  final Set<String> productIds;
  CartItemsCheckedOut(this.productIds);

  @override
  List<Object?> get props => [productIds];
}

/// Internal: replace state after a successful server sync.
final class CartServerUpdated extends CartEvent {
  final List<CartItemEntity> items;
  CartServerUpdated(this.items);

  @override
  List<Object?> get props => [items];
}
