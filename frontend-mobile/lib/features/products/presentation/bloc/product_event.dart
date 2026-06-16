import 'package:equatable/equatable.dart';

sealed class ProductEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

final class ProductsLoadRequested extends ProductEvent {
  final String? search;
  final String? category;
  final String? sortBy;
  final bool refresh;

  ProductsLoadRequested({
    this.search,
    this.category,
    this.sortBy,
    this.refresh = false,
  });

  @override
  List<Object?> get props => [search, category, sortBy, refresh];
}

final class ProductDetailRequested extends ProductEvent {
  final String id;
  ProductDetailRequested(this.id);

  @override
  List<Object?> get props => [id];
}

final class CategoriesLoadRequested extends ProductEvent {}
