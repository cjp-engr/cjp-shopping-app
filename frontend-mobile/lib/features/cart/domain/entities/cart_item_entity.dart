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

  double get rawPrice => selectedVariant?.price ?? product.price;

  double get effectivePrice {
    final v = selectedVariant;
    if (v != null) {
      final d = v.discount;
      return d != null && d > 0 ? v.price * (1 - d / 100) : v.price;
    }
    final d = product.discount;
    if (d == null || d <= 0) return product.price;
    return product.price * (1 - d / 100);
  }

  bool get hasDiscount => (rawPrice - effectivePrice).abs() > 0.001;
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
