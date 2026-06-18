import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/seller_repository.dart';
import 'seller_event.dart';
import 'seller_state.dart';

class SellerBloc extends Bloc<SellerEvent, SellerState> {
  final SellerRepository _repository;

  SellerBloc(this._repository) : super(const SellerState()) {
    on<SellerProductsLoadRequested>(_onLoad);
    on<SellerProductCreateRequested>(_onCreate);
    on<SellerProductUpdateRequested>(_onUpdate);
    on<SellerProductDeleteRequested>(_onDelete);
  }

  Future<void> _onLoad(
      SellerProductsLoadRequested event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerStatus.loading));
    try {
      final products = await _repository.getMyProducts();
      emit(state.copyWith(status: SellerStatus.success, products: products));
    } catch (e) {
      emit(state.copyWith(
          status: SellerStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onCreate(
      SellerProductCreateRequested event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerStatus.saving));
    try {
      final product = await _repository.createProduct(event.data,
          imagePaths: event.imagePaths);
      emit(state.copyWith(
        status: SellerStatus.success,
        products: [product, ...state.products],
      ));
    } catch (e) {
      emit(state.copyWith(
          status: SellerStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onUpdate(
      SellerProductUpdateRequested event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerStatus.saving));
    try {
      final updated = await _repository.updateProduct(event.id, event.data,
          imagePaths: event.imagePaths);
      final products =
          state.products.map((p) => p.id == event.id ? updated : p).toList();
      emit(state.copyWith(status: SellerStatus.success, products: products));
    } catch (e) {
      emit(state.copyWith(
          status: SellerStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onDelete(
      SellerProductDeleteRequested event, Emitter<SellerState> emit) async {
    emit(state.copyWith(status: SellerStatus.saving));
    try {
      await _repository.deleteProduct(event.id);
      final products =
          state.products.where((p) => p.id != event.id).toList();
      emit(state.copyWith(status: SellerStatus.success, products: products));
    } catch (e) {
      emit(state.copyWith(
          status: SellerStatus.failure, errorMessage: e.toString()));
    }
  }
}
