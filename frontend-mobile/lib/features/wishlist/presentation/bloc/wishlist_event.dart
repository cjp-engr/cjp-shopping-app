import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product_entity.dart';

abstract class WishlistEvent extends Equatable {
  const WishlistEvent();
  @override
  List<Object?> get props => [];
}

class WishlistToggled extends WishlistEvent {
  final ProductEntity product;
  const WishlistToggled(this.product);
  @override
  List<Object?> get props => [product.id];
}

class WishlistCleared extends WishlistEvent {
  const WishlistCleared();
}
