import '../../domain/entities/order_entity.dart';

class OrderAddressModel extends OrderAddressEntity {
  const OrderAddressModel({
    required super.street,
    required super.city,
    required super.state,
    required super.zipCode,
    required super.country,
  });

  factory OrderAddressModel.fromJson(Map<String, dynamic> json) =>
      OrderAddressModel(
        street: json['street'] ?? '',
        city: json['city'] ?? '',
        state: json['state'] ?? '',
        zipCode: json['zipCode'] ?? '',
        country: json['country'] ?? '',
      );

  Map<String, dynamic> toJson() => {
        'street': street,
        'city': city,
        'state': state,
        'zipCode': zipCode,
        'country': country,
      };
}

class OrderItemModel extends OrderItemEntity {
  const OrderItemModel({
    required super.productId,
    required super.productName,
    required super.productImage,
    required super.price,
    required super.quantity,
    super.sellerId,
    super.sellerName,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    final product = json['product'];

    // product is a populated Map (from .populate() on getOrders)
    if (product is Map) {
      // Mongoose populates the field under its schema key name ('sellerId')
      // but some responses may use 'seller' or 'createdBy'
      final rawSeller =
          product['sellerId'] ?? product['seller'] ?? product['createdBy'];
      final seller = rawSeller is Map ? rawSeller : null;
      final sellerId = seller != null
          ? seller['_id']?.toString() ?? seller['id']?.toString()
          : rawSeller?.toString();
      String? sellerName;
      if (seller != null) {
        final fullName = seller['fullName']?.toString().trim();
        if (fullName != null && fullName.isNotEmpty) {
          sellerName = fullName;
        } else {
          final first = seller['firstName']?.toString() ?? '';
          final last = seller['lastName']?.toString() ?? '';
          final combined = '$first $last'.trim();
          if (combined.isNotEmpty) sellerName = combined;
        }
      }
      return OrderItemModel(
        productId: product['_id']?.toString() ?? product['id']?.toString() ?? '',
        productName: product['name'] ?? json['productName'] ?? '',
        productImage: product['image'] ?? json['productImage'] ?? '',
        price: (product['price'] as num?)?.toDouble() ??
            (json['productPrice'] as num?)?.toDouble() ?? 0,
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        sellerId: sellerId,
        sellerName: sellerName,
      );
    }

    // product is an ObjectId string (from createOrder response, not populated)
    return OrderItemModel(
      productId: product?.toString() ?? json['productId']?.toString() ?? '',
      productName: json['productName'] ?? '',
      productImage: json['productImage'] ?? '',
      price: (json['productPrice'] as num?)?.toDouble() ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
    );
  }
}

class OrderModel extends OrderEntity {
  const OrderModel({
    required super.id,
    required super.userId,
    required super.items,
    required super.shippingAddress,
    required super.paymentType,
    required super.subtotal,
    required super.tax,
    required super.shipping,
    required super.total,
    required super.status,
    required super.createdAt,
    super.estimatedDelivery,
    super.sellerMessages = const {},
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final itemList = (json['items'] as List?)
            ?.map((e) => OrderItemModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];
    final payment = json['paymentMethod'] as Map<String, dynamic>? ?? {};

    // sellerMessages stored as Mongoose Map — comes as plain object
    final rawMessages = json['sellerMessages'];
    final Map<String, String> sellerMessages = {};
    if (rawMessages is Map) {
      rawMessages.forEach((k, v) {
        if (v is String && v.isNotEmpty) {
          sellerMessages[k.toString()] = v;
        }
      });
    }

    return OrderModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      userId: json['user']?.toString() ?? json['userId']?.toString() ?? '',
      items: itemList,
      shippingAddress: OrderAddressModel.fromJson(
          json['shippingAddress'] as Map<String, dynamic>? ?? {}),
      paymentType: payment['type'] ?? 'credit-card',
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      tax: (json['tax'] as num?)?.toDouble() ?? 0,
      shipping: (json['shipping'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      status: json['status'] ?? 'pending',
      createdAt: json['createdAt'] ?? '',
      estimatedDelivery: json['estimatedDelivery'],
      sellerMessages: sellerMessages,
    );
  }
}
