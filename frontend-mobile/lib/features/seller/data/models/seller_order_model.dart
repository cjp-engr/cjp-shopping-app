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
    final line2 = [city, state, zipCode].where((s) => s.isNotEmpty).join(', ');
    return [
      street,
      if (line2.isNotEmpty) line2,
      if (country.isNotEmpty) country
    ].join('\n');
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

class SellerOrderPayment {
  final String type;
  final String last4;
  final String cardHolder;

  const SellerOrderPayment({
    required this.type,
    this.last4 = '',
    this.cardHolder = '',
  });

  static const _labels = {
    'credit-card': 'Credit Card',
    'debit-card': 'Debit Card',
    'paypal': 'PayPal',
    'cash-on-delivery': 'Cash on Delivery',
  };

  String get methodLabel => _labels[type] ??
      type
          .split('-')
          .map((part) => part.isEmpty
              ? part
              : '${part[0].toUpperCase()}${part.substring(1)}')
          .join(' ');

  String get maskedCard =>
      last4.isEmpty ? methodLabel : '$methodLabel •••• $last4';

  factory SellerOrderPayment.fromJson(Map<String, dynamic> json) {
    return SellerOrderPayment(
      type: json['type']?.toString() ?? '',
      last4: json['last4']?.toString() ?? '',
      cardHolder: json['cardHolder']?.toString() ?? '',
    );
  }
}

class SellerOrderItemData {
  final String productId;
  final String productName;
  final String productImage;
  final double price;
  final double discountPercent;
  final int quantity;
  final Map<String, String> selectedAttributes;

  const SellerOrderItemData({
    required this.productId,
    required this.productName,
    required this.productImage,
    required this.price,
    this.discountPercent = 0,
    required this.quantity,
    this.selectedAttributes = const {},
  });

  bool get hasDiscount => discountPercent > 0;
  double get salePrice =>
      hasDiscount ? price * (1 - discountPercent / 100) : price;
  double get lineTotal => price * quantity;
  double get saleLineTotal => salePrice * quantity;

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
    final discountPercent = (json['discountPercent'] as num?)?.toDouble() ??
        (json['variantDiscount'] as num?)?.toDouble() ??
        0;
    if (product is Map) {
      return SellerOrderItemData(
        productId: product['_id']?.toString() ?? '',
        productName: product['name'] ?? json['productName'] ?? '',
        productImage: product['image'] ?? json['productImage'] ?? '',
        price: storedPrice ?? (product['price'] as num?)?.toDouble() ?? 0,
        discountPercent: discountPercent,
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        selectedAttributes: attrs,
      );
    }
    return SellerOrderItemData(
      productId: product?.toString() ?? '',
      productName: json['productName'] ?? '',
      productImage: json['productImage'] ?? '',
      price: storedPrice ?? 0,
      discountPercent: discountPercent,
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
  final String? selectedDeliveryOption;
  final SellerOrderBuyer? buyer;
  final SellerOrderAddress? shippingAddress;
  final SellerOrderPayment? paymentMethod;
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
    this.selectedDeliveryOption,
    this.buyer,
    this.shippingAddress,
    this.paymentMethod,
  });

  String get shortId =>
      id.length >= 8 ? id.substring(0, 8).toUpperCase() : id.toUpperCase();

  bool get isActive => !['delivered', 'cancelled'].contains(status);
  bool get isPending => status == 'pending';
  bool get canMarkPreparing => status == 'pending';
  bool get canMarkToShip => status == 'preparing';
  bool get canMarkShipped => status == 'processing';
  bool get canCancel =>
      status == 'pending' ||
      status == 'preparing' ||
      status == 'processing' ||
      status == 'shipped';

  SellerOrderData copyWith({String? status, String? cancelReason}) =>
      SellerOrderData(
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
        selectedDeliveryOption: selectedDeliveryOption,
        buyer: buyer,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
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
      shippingAddress =
          SellerOrderAddress.fromJson(addrJson.cast<String, dynamic>());
    }

    final itemList = (json['items'] as List?)
            ?.map(
                (e) => SellerOrderItemData.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    final sub = (json['subtotal'] as num?)?.toDouble() ?? 0;
    final prodDisc = (json['productDiscount'] as num?)?.toDouble() ?? 0;
    final disc = (json['discount'] as num?)?.toDouble() ?? 0;
    final tx = (json['tax'] as num?)?.toDouble() ?? 0;
    final sh = (json['shipping'] as num?)?.toDouble() ?? 0;

    String? deliveryOption;
    final ds = json['deliverySelections'];
    if (ds is Map && ds.isNotEmpty) {
      deliveryOption = ds.values.first?.toString();
    }
    deliveryOption ??= json['selectedDeliveryOption'] as String?;

    final paymentJson = json['paymentMethod'];
    final paymentMethod = paymentJson is Map
        ? SellerOrderPayment.fromJson(paymentJson.cast<String, dynamic>())
        : null;

    return SellerOrderData(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      status: json['status'] ?? 'pending',
      cancelReason: json['cancelReason'] as String?,
      selectedDeliveryOption: deliveryOption,
      subtotal: sub,
      productDiscount: prodDisc,
      discount: disc,
      tax: tx,
      shipping: sh,
      total: (json['total'] as num?)?.toDouble() ?? (sub + tx + sh),
      createdAt: json['createdAt'] ?? '',
      buyer: buyer,
      shippingAddress: shippingAddress,
      paymentMethod: paymentMethod,
      items: itemList,
    );
  }
}
