import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/product_repository.dart';
import 'product_event.dart';
import 'product_state.dart';

class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final ProductRepository _repository;

  ProductBloc(this._repository) : super(const ProductState()) {
    on<ProductsLoadRequested>(_onLoad);
    on<ProductDetailRequested>(_onDetail);
    on<CategoriesLoadRequested>(_onCategories);
  }

  Future<void> _onLoad(
      ProductsLoadRequested event, Emitter<ProductState> emit) async {
    emit(state.copyWith(
      status: ProductStatus.loading,
      activeCategory: event.category,
      searchQuery: event.search,
    ));
    try {
      final products = await _repository.getProducts(
        search: event.search,
        category: event.category,
        sortBy: event.sortBy,
      );
      emit(state.copyWith(status: ProductStatus.success, products: products));
    } catch (e) {
      emit(state.copyWith(
          status: ProductStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onDetail(
      ProductDetailRequested event, Emitter<ProductState> emit) async {
    emit(state.copyWith(status: ProductStatus.loading, selectedProduct: null));
    try {
      final product = await _repository.getProduct(event.id);
      emit(state.copyWith(
          status: ProductStatus.success, selectedProduct: product));
    } catch (e) {
      emit(state.copyWith(
          status: ProductStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onCategories(
      CategoriesLoadRequested event, Emitter<ProductState> emit) async {
    try {
      final cats = await _repository.getCategories();
      emit(state.copyWith(categories: cats));
    } catch (_) {}
  }
}
