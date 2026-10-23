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

  /// One-off notice for the last order status change (shown as a SnackBar).
  final String? statusMessage;
  final bool statusMessageIsInfo;

  /// Orders with a status change in flight, so one order cannot be sent twice.
  final Set<String> updatingOrderIds;

  const SellerState({
    this.status = SellerStatus.initial,
    this.products = const [],
    this.ordersStatus = SellerOrdersStatus.initial,
    this.orders = const [],
    this.errorMessage,
    this.statusMessage,
    this.statusMessageIsInfo = false,
    this.updatingOrderIds = const {},
  });

  SellerState copyWith({
    SellerStatus? status,
    List<ProductEntity>? products,
    SellerOrdersStatus? ordersStatus,
    List<SellerOrderData>? orders,
    String? errorMessage,
    String? statusMessage,
    bool? statusMessageIsInfo,
    bool clearStatusMessage = false,
    Set<String>? updatingOrderIds,
  }) {
    return SellerState(
      status: status ?? this.status,
      products: products ?? this.products,
      ordersStatus: ordersStatus ?? this.ordersStatus,
      orders: orders ?? this.orders,
      errorMessage: errorMessage,
      statusMessage:
          clearStatusMessage ? null : (statusMessage ?? this.statusMessage),
      statusMessageIsInfo: clearStatusMessage
          ? false
          : (statusMessageIsInfo ?? this.statusMessageIsInfo),
      updatingOrderIds: updatingOrderIds ?? this.updatingOrderIds,
    );
  }

  int get activeOrderCount => orders.where((o) => o.isActive).length;

  int get pendingOrderCount => orders.where((o) => o.isPending).length;

  double get revenue =>
      orders.where((o) => o.status == 'delivered').fold(0, (sum, o) {
        final factor = o.currency.toLowerCase() == 'jpy' ? 1 : 100;
        final minor = (o.total * factor).round() - o.refundedAmountMinor;
        return sum + (minor < 0 ? 0 : minor) / factor;
      });

  int get actionableOrderCount => orders
      .where((o) =>
          ['pending', 'preparing', 'processing', 'shipped'].contains(o.status))
      .length;

  @override
  List<Object?> get props => [
        status,
        products,
        ordersStatus,
        orders,
        errorMessage,
        statusMessage,
        statusMessageIsInfo,
        updatingOrderIds,
      ];
}
