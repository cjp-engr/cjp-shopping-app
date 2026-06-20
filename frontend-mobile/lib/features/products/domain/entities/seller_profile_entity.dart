import 'package:equatable/equatable.dart';
import 'product_entity.dart';

class SellerInfoEntity extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String createdAt;
  final String? avatar;

  const SellerInfoEntity({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.createdAt,
    this.avatar,
  });

  String get fullName => '$firstName $lastName';

  @override
  List<Object?> get props => [id, firstName, lastName, createdAt, avatar];
}

class SellerProfileEntity extends Equatable {
  final SellerInfoEntity seller;
  final List<ProductEntity> products;

  const SellerProfileEntity({
    required this.seller,
    required this.products,
  });

  @override
  List<Object?> get props => [seller, products];
}
