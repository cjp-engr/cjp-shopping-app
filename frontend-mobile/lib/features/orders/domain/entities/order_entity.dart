import 'package:equatable/equatable.dart';

class OrderAddressEntity {
  final String street;
  final String city;
  final String state;
  final String zipCode;
  final String country;

  const OrderAddressEntity({
    required this.street,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.country,
  });
}

class OrderItemEntity {
  final String productId;
  final String productName;
  final String productImage;
  final double price;
  final int quantity;
  final String? sellerId;
  final String? sellerName;
  final Map<String, String> selectedAttributes;

  const OrderItemEntity({
    required this.productId,
    required this.productName,
    required this.productImage,
    required this.price,
    required this.quantity,
    this.sellerId,
    this.sellerName,
    this.selectedAttributes = const {},
  });

  double get total => price * quantity;
}

class OrderEntity extends Equatable {
  final String id;
  final String userId;
  final List<OrderItemEntity> items;
  final OrderAddressEntity shippingAddress;
  final String paymentType;
  final double subtotal;
  final double productDiscount;
  final double discount;
  final double tax;
  final double shipping;
  final double total;
  final String status;
  final String? cancelReason;
  final String createdAt;
  final String? estimatedDelivery;
  final Map<String, String> sellerMessages;
  final String? selectedDeliveryOption;

  const OrderEntity({
    required this.id,
    required this.userId,
    required this.items,
    required this.shippingAddress,
    required this.paymentType,
    required this.subtotal,
    required this.productDiscount,
    required this.discount,
    required this.tax,
    required this.shipping,
    required this.total,
    required this.status,
    required this.createdAt,
    this.cancelReason,
    this.estimatedDelivery,
    this.sellerMessages = const {},
    this.selectedDeliveryOption,
  });

  String get shortId =>
      id.length >= 8 ? id.substring(0, 8).toUpperCase() : id.toUpperCase();

  @override
  List<Object?> get props => [id, status, total, cancelReason];
}
