import 'package:equatable/equatable.dart';

class ProductVariantAttribute extends Equatable {
  final String name;
  final List<String> values;

  const ProductVariantAttribute({required this.name, required this.values});

  @override
  List<Object?> get props => [name, values];
}

class ProductVariant extends Equatable {
  final Map<String, String> attributes;
  final double price;
  final int stock;
  final String sku;
  final String image;

  const ProductVariant({
    required this.attributes,
    required this.price,
    required this.stock,
    this.sku = '',
    this.image = '',
  });

  String get label => attributes.values.join(' / ');

  @override
  List<Object?> get props => [attributes, price, stock, sku, image];
}

class ProductEntity extends Equatable {
  final String id;
  final String name;
  final String description;
  final double price;
  final String category;
  final String image;
  final List<String> images;
  final int stock;
  final double rating;
  final int reviews;
  final List<String> tags;
  final Map<String, String> specifications;
  final String createdAt;
  final String? sellerId;
  final String? sellerName;
  final String? sellerAvatar;
  final int soldCount;
  final String? brand;
  final String? condition;
  final String? sku;
  final double? discount;
  final List<String> shippingOptions;
  final String? shippingFee;
  final Map<String, double> shippingFeeAmounts;
  final List<ProductVariantAttribute> variantAttributes;
  final List<ProductVariant> variants;

  const ProductEntity({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.image,
    this.images = const [],
    required this.stock,
    required this.rating,
    required this.reviews,
    this.soldCount = 0,
    this.tags = const [],
    this.specifications = const {},
    required this.createdAt,
    this.sellerId,
    this.sellerName,
    this.sellerAvatar,
    this.brand,
    this.condition,
    this.sku,
    this.discount,
    this.shippingOptions = const [],
    this.shippingFee,
    this.shippingFeeAmounts = const {},
    this.variantAttributes = const [],
    this.variants = const [],
  });

  bool get inStock => stock > 0;
  bool get lowStock => stock > 0 && stock <= 5;
  bool get hasVariants => variantAttributes.isNotEmpty;

  @override
  List<Object?> get props => [id, name, price, category, stock, sellerId, sellerName, sellerAvatar];
}
