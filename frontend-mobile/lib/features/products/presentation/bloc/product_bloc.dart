import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/product_repository.dart';
import 'product_event.dart';
import 'product_state.dart';

class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final ProductRepository _repository;

  static const _pageSize = 20;

  ProductBloc(this._repository) : super(const ProductState()) {
    on<ProductsLoadRequested>(_onLoad);
    on<ProductsLoadMoreRequested>(_onLoadMore);
    on<ProductDetailRequested>(_onDetail);
    on<CategoriesLoadRequested>(_onCategories);
    on<SellerProfileRequested>(_onSellerProfile);
  }

  Future<void> _onLoad(
      ProductsLoadRequested event, Emitter<ProductState> emit) async {
    emit(state.copyWith(
      status: ProductStatus.loading,
      activeCategory: event.category,
      searchQuery: event.search,
      activeSortBy: event.sortBy,
      currentPage: 1,
      hasMore: true,
      isLoadingMore: false,
    ));
    try {
      final products = await _repository.getProducts(
        search: event.search,
        category: event.category,
        sort: event.sortBy,
        page: 1,
        limit: _pageSize,
      );
      emit(state.copyWith(
        status: ProductStatus.success,
        products: products,
        currentPage: 1,
        hasMore: products.length >= _pageSize,
      ));
    } catch (e) {
      emit(state.copyWith(
          status: ProductStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onLoadMore(
      ProductsLoadMoreRequested event, Emitter<ProductState> emit) async {
    if (state.isLoadingMore || !state.hasMore) return;
    emit(state.copyWith(isLoadingMore: true));
    try {
      final nextPage = state.currentPage + 1;
      final more = await _repository.getProducts(
        search: state.searchQuery,
        category: state.activeCategory,
        sort: state.activeSortBy,
        page: nextPage,
        limit: _pageSize,
      );
      emit(state.copyWith(
        isLoadingMore: false,
        products: [...state.products, ...more],
        currentPage: nextPage,
        hasMore: more.length >= _pageSize,
      ));
    } catch (_) {
      emit(state.copyWith(isLoadingMore: false));
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

  Future<void> _onSellerProfile(
      SellerProfileRequested event, Emitter<ProductState> emit) async {
    emit(state.copyWith(sellerProfileStatus: ProductStatus.loading));
    try {
      final profile = await _repository.getSellerProfile(event.sellerId);
      emit(state.copyWith(
        sellerProfileStatus: ProductStatus.success,
        sellerProfile: profile,
      ));
    } catch (e) {
      emit(state.copyWith(
        sellerProfileStatus: ProductStatus.failure,
        sellerProfileError: e.toString(),
      ));
    }
  }
}
