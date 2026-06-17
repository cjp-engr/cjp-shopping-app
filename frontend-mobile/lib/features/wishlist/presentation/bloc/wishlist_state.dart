import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product_entity.dart';

class WishlistState extends Equatable {
  final List<ProductEntity> items;

  const WishlistState({this.items = const []});

  bool contains(String productId) =>
      items.any((p) => p.id == productId);

  WishlistState copyWith({List<ProductEntity>? items}) =>
      WishlistState(items: items ?? this.items);

  @override
  List<Object?> get props => [items];
}
