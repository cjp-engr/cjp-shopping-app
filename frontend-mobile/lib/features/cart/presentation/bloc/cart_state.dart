import 'package:equatable/equatable.dart';
import '../../domain/entities/cart_item_entity.dart';

class CartState extends Equatable {
  final List<CartItemEntity> items;

  const CartState({this.items = const []});

  int get itemCount => items.length;
  int get totalQuantity => items.fold(0, (s, i) => s + i.quantity);
  double get subtotal => items.fold(0, (s, i) => s + i.subtotal);
  double get shipping => subtotal >= 50 ? 0 : 9.99;
  double get tax => subtotal * 0.08;
  double get total => subtotal + shipping + tax;
  bool get freeShipping => subtotal >= 50;

  @override
  List<Object?> get props => [items];
}
