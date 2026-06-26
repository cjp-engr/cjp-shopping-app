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
  CartItemAdded({required this.product, this.quantity = 1});

  @override
  List<Object?> get props => [product.id, quantity];
}

final class CartItemRemoved extends CartEvent {
  final String productId;
  CartItemRemoved(this.productId);

  @override
  List<Object?> get props => [productId];
}

final class CartItemQuantityChanged extends CartEvent {
  final String productId;
  final int quantity;
  CartItemQuantityChanged(this.productId, this.quantity);

  @override
  List<Object?> get props => [productId, quantity];
}

final class CartCleared extends CartEvent {}

/// Internal: replace state after a successful server sync.
final class CartServerUpdated extends CartEvent {
  final List<CartItemEntity> items;
  CartServerUpdated(this.items);

  @override
  List<Object?> get props => [items];
}
