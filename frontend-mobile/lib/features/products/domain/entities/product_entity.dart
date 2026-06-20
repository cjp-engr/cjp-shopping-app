import 'package:equatable/equatable.dart';

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
    this.tags = const [],
    this.specifications = const {},
    required this.createdAt,
    this.sellerId,
    this.sellerName,
    this.sellerAvatar,
  });

  bool get inStock => stock > 0;
  bool get lowStock => stock > 0 && stock <= 5;

  @override
  List<Object?> get props => [id, name, price, category, stock, sellerId, sellerName, sellerAvatar];
}
