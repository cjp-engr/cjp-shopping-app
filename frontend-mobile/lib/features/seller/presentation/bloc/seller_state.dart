import 'package:equatable/equatable.dart';
import '../../../products/domain/entities/product_entity.dart';
import '../../data/models/seller_order_model.dart';

enum SellerStatus { initial, loading, success, saving, failure }

enum SellerOrdersStatus { initial, loading, success, failure }

class SellerState extends Equatable {
  final SellerStatus status;
  final List<ProductEntity> products;
  final SellerOrdersStatus ordersStatus;
  final List<SellerOrderData> orders;
  final String? errorMessage;

  const SellerState({
    this.status = SellerStatus.initial,
    this.products = const [],
    this.ordersStatus = SellerOrdersStatus.initial,
    this.orders = const [],
    this.errorMessage,
  });

  SellerState copyWith({
    SellerStatus? status,
    List<ProductEntity>? products,
    SellerOrdersStatus? ordersStatus,
    List<SellerOrderData>? orders,
    String? errorMessage,
  }) {
    return SellerState(
      status: status ?? this.status,
      products: products ?? this.products,
      ordersStatus: ordersStatus ?? this.ordersStatus,
      orders: orders ?? this.orders,
      errorMessage: errorMessage,
    );
  }

  int get activeOrderCount =>
      orders.where((o) => o.isActive).length;

  int get pendingOrderCount =>
      orders.where((o) => o.isPending).length;

  double get revenue => orders
      .where((o) => o.status == 'delivered')
      .fold(0, (sum, o) => sum + o.total);

  int get actionableOrderCount => orders
      .where((o) => ['pending', 'preparing', 'processing', 'shipped'].contains(o.status))
      .length;

  @override
  List<Object?> get props =>
      [status, products, ordersStatus, orders, errorMessage];
}
