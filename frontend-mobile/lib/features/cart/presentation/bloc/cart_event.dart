import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product_entity.dart';

sealed class CartEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

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
