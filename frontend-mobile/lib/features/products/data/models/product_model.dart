import '../../domain/entities/product_entity.dart';

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
    super.tags,
    super.specifications,
    required super.createdAt,
    super.sellerId,
    super.sellerName,
    super.sellerAvatar,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final rawSeller = json['sellerId'] ?? json['seller'] ?? json['createdBy'];
    final sellerId = rawSeller is Map
        ? rawSeller['_id']?.toString() ?? rawSeller['id']?.toString()
        : rawSeller?.toString();
    final sellerName = rawSeller is Map
        ? '${rawSeller['firstName'] ?? ''} ${rawSeller['lastName'] ?? ''}'.trim()
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
      tags: (json['tags'] as List?)?.map((e) => e.toString()).toList() ?? [],
      specifications: json['specifications'] != null
          ? Map<String, String>.from(json['specifications'] as Map)
          : {},
      createdAt: json['createdAt'] ?? '',
      sellerId: sellerId,
      sellerName: sellerName?.isNotEmpty == true ? sellerName : null,
      sellerAvatar: sellerAvatar?.isNotEmpty == true ? sellerAvatar : null,
    );
  }
}
