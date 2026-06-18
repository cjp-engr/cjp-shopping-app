import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product_entity.dart';

enum SellerStatus { initial, loading, success, saving, failure }

class SellerState extends Equatable {
  final SellerStatus status;
  final List<ProductEntity> products;
  final String? errorMessage;

  const SellerState({
    this.status = SellerStatus.initial,
    this.products = const [],
    this.errorMessage,
  });

  SellerState copyWith({
    SellerStatus? status,
    List<ProductEntity>? products,
    String? errorMessage,
  }) {
    return SellerState(
      status: status ?? this.status,
      products: products ?? this.products,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, products, errorMessage];
}
