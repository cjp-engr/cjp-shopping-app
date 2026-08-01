import 'dart:convert';
import '../../domain/entities/product_entity.dart';

List<String> _parseTags(dynamic value) {
  if (value == null) return [];
  if (value is List) {
    if (value.isEmpty) return [];
    final first = value.first;
    // Detect legacy JSON-stringified array stored as a single list element
    if (value.length == 1 && first is String && first.startsWith('[')) {
      try {
        final decoded = jsonDecode(first);
        if (decoded is List) return decoded.map((e) => e.toString()).toList();
      } catch (_) {}
    }
    return value.map((e) => e.toString()).toList();
  }
  if (value is String) {
    if (value.startsWith('[')) {
      try {
        final decoded = jsonDecode(value);
        if (decoded is List) return decoded.map((e) => e.toString()).toList();
      } catch (_) {}
    }
    return [value];
  }
  return [];
}

class ProductVariantAttributeModel extends ProductVariantAttribute {
  const ProductVariantAttributeModel({required super.name, required super.values});

  factory ProductVariantAttributeModel.fromJson(Map<String, dynamic> json) =>
      ProductVariantAttributeModel(
        name: json['name']?.toString() ?? '',
        values: (json['values'] as List?)?.map((e) => e.toString()).toList() ?? [],
      );

  Map<String, dynamic> toJson() => {'name': name, 'values': values};
}

class ProductVariantModel extends ProductVariant {
  const ProductVariantModel({
    super.variantId,
    required super.attributes,
    required super.price,
    required super.stock,
    super.sku,
    super.image,
    super.discount,
  });

  factory ProductVariantModel.fromJson(Map<String, dynamic> json) =>
      ProductVariantModel(
        variantId: json['_id']?.toString() ?? json['variantId']?.toString() ?? '',
        attributes: json['attributes'] is Map
            ? Map<String, String>.fromEntries(
                (json['attributes'] as Map).entries.map(
                  (e) => MapEntry(e.key.toString(), e.value.toString()),
                ),
              )
            : {},
        price: (json['price'] as num?)?.toDouble() ?? 0.0,
        stock: (json['stock'] as num?)?.toInt() ?? 0,
        sku: json['sku']?.toString() ?? '',
        image: json['image']?.toString() ?? '',
        discount: (json['discount'] as num?)?.toDouble(),
      );

  Map<String, dynamic> toJson() => {
    'variantId': variantId,
    'attributes': attributes,
    'price': price,
    'stock': stock,
    'sku': sku,
    'image': image,
    if (discount != null) 'discount': discount,
  };
}

class ProductModel extends ProductEntity {
  const ProductModel({
    required super.id,
    required super.name,
    required super.description,
    required super.price,
    required super.category,
    required super.image,
    super.images,
    required super.stock,
    required super.rating,
    required super.reviews,
    super.soldCount,
    super.tags,
    super.specifications,
    required super.createdAt,
    super.sellerId,
    super.sellerName,
    super.sellerAvatar,
    super.brand,
    super.condition,
    super.sku,
    super.discount,
    super.shippingOptions,
    super.shippingFee,
    super.shippingFeeAmounts,
    super.variantAttributes,
    super.variants,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final rawSeller = json['sellerId'] ?? json['seller'] ?? json['createdBy'];
    final sellerId = rawSeller is Map
        ? rawSeller['_id']?.toString() ?? rawSeller['id']?.toString()
        : rawSeller?.toString();
    final sellerName = rawSeller is Map
        ? (rawSeller['fullName']?.toString().trim().isNotEmpty == true
            ? rawSeller['fullName'].toString().trim()
            : '${rawSeller['firstName'] ?? ''} ${rawSeller['lastName'] ?? ''}'.trim())
        : null;
    final sellerAvatar = rawSeller is Map
        ? rawSeller['avatar']?.toString()
        : null;

    return ProductModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      category: json['category'] ?? '',
      image: json['image'] ?? '',
      images: (json['images'] as List?)?.map((e) => e.toString()).toList() ?? [],
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      reviews: (json['reviews'] as num?)?.toInt() ?? 0,
      soldCount: (json['soldCount'] as num?)?.toInt() ?? 0,
      tags: _parseTags(json['tags']),
      specifications: json['specifications'] != null
          ? Map<String, String>.from(json['specifications'] as Map)
          : {},
      createdAt: json['createdAt'] ?? '',
      sellerId: sellerId,
      sellerName: sellerName?.isNotEmpty == true ? sellerName : null,
      sellerAvatar: sellerAvatar?.isNotEmpty == true ? sellerAvatar : null,
      brand: json['brand']?.toString(),
      condition: json['condition']?.toString(),
      sku: json['sku']?.toString(),
      discount: (json['discount'] as num?)?.toDouble(),
      shippingOptions: (json['shippingOptions'] as List?)?.map((e) => e.toString()).toList() ?? [],
      shippingFee: json['shippingFee']?.toString(),
      shippingFeeAmounts: json['shippingFeeAmounts'] is Map
          ? Map<String, double>.fromEntries(
              (json['shippingFeeAmounts'] as Map).entries.map(
                    (e) => MapEntry(e.key.toString(), (e.value as num).toDouble()),
                  ),
            )
          : const {},
      variantAttributes: (json['variantAttributes'] as List?)
          ?.map((e) => ProductVariantAttributeModel.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
      variants: (json['variants'] as List?)
          ?.map((e) => ProductVariantModel.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}
