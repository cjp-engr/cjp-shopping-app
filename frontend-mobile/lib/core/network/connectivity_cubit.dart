import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class ConnectivityCubit extends Cubit<bool> {
  final Connectivity _connectivity;
  late final StreamSubscription<List<ConnectivityResult>> _subscription;

  ConnectivityCubit({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity(),
        super(true) {
    _subscription = _connectivity.onConnectivityChanged.listen(_onChanged);
    _connectivity.checkConnectivity().then(_onChanged);
  }

  void _onChanged(List<ConnectivityResult> results) {
    emit(!results.contains(ConnectivityResult.none) && results.isNotEmpty);
  }

  @override
  Future<void> close() {
    _subscription.cancel();
    return super.close();
  }
}
