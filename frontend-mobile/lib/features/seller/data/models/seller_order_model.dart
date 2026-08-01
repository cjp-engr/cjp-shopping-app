class SellerOrderAddress {
  final String street;
  final String city;
  final String state;
  final String zipCode;
  final String country;

  const SellerOrderAddress({
    required this.street,
    required this.city,
    required this.state,
    required this.zipCode,
    required this.country,
  });

  String get formatted {
    final line2 = [city, state, zipCode]
        .where((s) => s.isNotEmpty)
        .join(', ');
    return [street, if (line2.isNotEmpty) line2, if (country.isNotEmpty) country]
        .join('\n');
  }

  factory SellerOrderAddress.fromJson(Map<String, dynamic> json) {
    return SellerOrderAddress(
      street: json['street']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      state: json['state']?.toString() ?? '',
      zipCode: json['zipCode']?.toString() ?? '',
      country: json['country']?.toString() ?? '',
    );
  }
}

class SellerOrderBuyer {
  final String id;
  final String firstName;
  final String lastName;
  final String email;

  const SellerOrderBuyer({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
  });

  String get fullName => '$firstName $lastName'.trim();
}

class SellerOrderItemData {
  final String productId;
  final String productName;
  final String productImage;
  final double price;
  final int quantity;
  final Map<String, String> selectedAttributes;

  const SellerOrderItemData({
    required this.productId,
    required this.productName,
    required this.productImage,
    required this.price,
    required this.quantity,
    this.selectedAttributes = const {},
  });

  double get lineTotal => price * quantity;

  static Map<String, String> _parseAttrs(dynamic raw) {
    if (raw is! Map) return const {};
    return Map.fromEntries(
      raw.entries.map((e) => MapEntry(e.key.toString(), e.value.toString())),
    );
  }

  factory SellerOrderItemData.fromJson(Map<String, dynamic> json) {
    final product = json['product'];
    final attrs = _parseAttrs(json['selectedAttributes']);
    // productPrice is the variant price stored at order time — always prefer it
    final storedPrice = (json['productPrice'] as num?)?.toDouble();
    if (product is Map) {
      return SellerOrderItemData(
        productId: product['_id']?.toString() ?? '',
        productName: product['name'] ?? json['productName'] ?? '',
        productImage: product['image'] ?? json['productImage'] ?? '',
        price: storedPrice ?? (product['price'] as num?)?.toDouble() ?? 0,
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        selectedAttributes: attrs,
      );
    }
    return SellerOrderItemData(
      productId: product?.toString() ?? '',
      productName: json['productName'] ?? '',
      productImage: json['productImage'] ?? '',
      price: storedPrice ?? 0,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      selectedAttributes: attrs,
    );
  }
}

class SellerOrderData {
  final String id;
  final String status;
  final double subtotal;
  final double productDiscount;
  final double discount;
  final double tax;
  final double shipping;
  final double total;
  final String createdAt;
  final String? cancelReason;
  final SellerOrderBuyer? buyer;
  final SellerOrderAddress? shippingAddress;
  final List<SellerOrderItemData> items;

  const SellerOrderData({
    required this.id,
    required this.status,
    required this.subtotal,
    required this.productDiscount,
    required this.discount,
    required this.tax,
    required this.shipping,
    required this.total,
    required this.createdAt,
    required this.items,
    this.cancelReason,
    this.buyer,
    this.shippingAddress,
  });

  String get shortId =>
      id.length >= 8 ? id.substring(0, 8).toUpperCase() : id.toUpperCase();

  bool get isActive => !['delivered', 'cancelled'].contains(status);
  bool get isPending => status == 'pending';
  bool get canMarkPreparing => status == 'pending';
  bool get canMarkToShip => status == 'preparing';
  bool get canMarkShipped => status == 'processing';
  bool get canCancel =>
      status == 'pending' || status == 'preparing' || status == 'processing' || status == 'shipped';

  SellerOrderData copyWith({String? status, String? cancelReason}) => SellerOrderData(
        id: id,
        status: status ?? this.status,
        subtotal: subtotal,
        productDiscount: productDiscount,
        discount: discount,
        tax: tax,
        shipping: shipping,
        total: total,
        createdAt: createdAt,
        cancelReason: cancelReason ?? this.cancelReason,
        buyer: buyer,
        shippingAddress: shippingAddress,
        items: items,
      );

  factory SellerOrderData.fromJson(Map<String, dynamic> json) {
    final userJson = json['userId'];
    SellerOrderBuyer? buyer;
    if (userJson is Map) {
      buyer = SellerOrderBuyer(
        id: userJson['_id']?.toString() ?? '',
        firstName: userJson['firstName']?.toString() ?? '',
        lastName: userJson['lastName']?.toString() ?? '',
        email: userJson['email']?.toString() ?? '',
      );
    }

    final addrJson = json['shippingAddress'];
    SellerOrderAddress? shippingAddress;
    if (addrJson is Map) {
      shippingAddress = SellerOrderAddress.fromJson(
          addrJson.cast<String, dynamic>());
    }

    final itemList = (json['items'] as List?)
            ?.map((e) =>
                SellerOrderItemData.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    final sub = (json['subtotal'] as num?)?.toDouble() ?? 0;
    final prodDisc = (json['productDiscount'] as num?)?.toDouble() ?? 0;
    final disc = (json['discount'] as num?)?.toDouble() ?? 0;
    final tx = (json['tax'] as num?)?.toDouble() ?? 0;
    final sh = (json['shipping'] as num?)?.toDouble() ?? 0;

    return SellerOrderData(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      status: json['status'] ?? 'pending',
      cancelReason: json['cancelReason'] as String?,
      subtotal: sub,
      productDiscount: prodDisc,
      discount: disc,
      tax: tx,
      shipping: sh,
      total: (json['total'] as num?)?.toDouble() ?? (sub + tx + sh),
      createdAt: json['createdAt'] ?? '',
      buyer: buyer,
      shippingAddress: shippingAddress,
      items: itemList,
    );
  }
}
