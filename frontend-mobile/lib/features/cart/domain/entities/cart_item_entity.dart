import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product_entity.dart';

class CartItemEntity extends Equatable {
  final ProductEntity product;
  final int quantity;

  const CartItemEntity({required this.product, required this.quantity});

  double get subtotal => product.price * quantity;

  CartItemEntity copyWith({int? quantity}) =>
      CartItemEntity(product: product, quantity: quantity ?? this.quantity);

  @override
  List<Object?> get props => [product.id, quantity];
}
