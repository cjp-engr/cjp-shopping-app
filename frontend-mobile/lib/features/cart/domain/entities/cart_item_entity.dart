import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product_entity.dart';

class CartItemEntity extends Equatable {
  final ProductEntity product;
  final int quantity;
  final ProductVariant? selectedVariant;

  const CartItemEntity({
    required this.product,
    required this.quantity,
    this.selectedVariant,
  });

  double get effectivePrice => selectedVariant?.price ?? product.price;
  int get effectiveStock => selectedVariant?.stock ?? product.stock;
  double get subtotal => effectivePrice * quantity;

  CartItemEntity copyWith({int? quantity, ProductVariant? selectedVariant}) =>
      CartItemEntity(
        product: product,
        quantity: quantity ?? this.quantity,
        selectedVariant: selectedVariant ?? this.selectedVariant,
      );

  @override
  List<Object?> get props => [product.id, selectedVariant?.label, quantity];
}
