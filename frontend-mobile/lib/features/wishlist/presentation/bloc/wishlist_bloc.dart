import 'package:flutter_bloc/flutter_bloc.dart';
import 'wishlist_event.dart';
import 'wishlist_state.dart';

class WishlistBloc extends Bloc<WishlistEvent, WishlistState> {
  WishlistBloc() : super(const WishlistState()) {
    on<WishlistToggled>(_onToggled);
    on<WishlistCleared>(_onCleared);
  }

  void _onToggled(WishlistToggled event, Emitter<WishlistState> emit) {
    final current = List.of(state.items);
    final idx = current.indexWhere((p) => p.id == event.product.id);
    if (idx >= 0) {
      current.removeAt(idx);
    } else {
      current.add(event.product);
    }
    emit(state.copyWith(items: current));
  }

  void _onCleared(WishlistCleared event, Emitter<WishlistState> emit) {
    emit(const WishlistState());
  }
}
