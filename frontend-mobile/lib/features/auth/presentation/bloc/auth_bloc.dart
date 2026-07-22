import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../../../shared/services/storage_service.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _repository;
  final StorageService _storage;

  AuthBloc(this._repository, this._storage) : super(const AuthState()) {
    on<AuthCheckRequested>(_onCheck);
    on<AuthLoginRequested>(_onLogin);
    on<AuthSignupRequested>(_onSignup);
    on<AuthLogoutRequested>(_onLogout);
    on<AuthProfileUpdateRequested>(_onProfileUpdate);
    on<AuthAvatarUploadRequested>(_onAvatarUpload);
    on<AuthAddressAddRequested>(_onAddressAdd);
    on<AuthAddressDeleteRequested>(_onAddressDelete);
    on<AuthAddressSetDefaultRequested>(_onAddressSetDefault);
  }

  Future<void> _onCheck(
      AuthCheckRequested event, Emitter<AuthState> emit) async {
    final token = await _storage.getToken();
    if (token == null) {
      emit(state.copyWith(status: AuthStatus.unauthenticated));
      return;
    }
    try {
      final user = await _repository.getMe();
      emit(state.copyWith(status: AuthStatus.authenticated, user: user));
    } catch (_) {
      await _storage.clear();
      emit(state.copyWith(status: AuthStatus.unauthenticated));
    }
  }

  Future<void> _onLogin(
      AuthLoginRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final result =
          await _repository.login(event.email, event.password);
      emit(state.copyWith(
          status: AuthStatus.authenticated, user: result.user));
    } catch (e) {
      emit(state.copyWith(
          status: AuthStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onSignup(
      AuthSignupRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final result = await _repository.signup(
        email: event.email,
        password: event.password,
        firstName: event.firstName,
        lastName: event.lastName,
      );
      emit(state.copyWith(
          status: AuthStatus.authenticated, user: result.user));
    } catch (e) {
      emit(state.copyWith(
          status: AuthStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onLogout(
      AuthLogoutRequested event, Emitter<AuthState> emit) async {
    await _repository.logout();
    emit(state.copyWith(status: AuthStatus.unauthenticated, user: null));
  }

  Future<void> _onProfileUpdate(
      AuthProfileUpdateRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final user = await _repository.updateProfile(event.data);
      emit(state.copyWith(status: AuthStatus.authenticated, user: user));
    } catch (e) {
      emit(state.copyWith(
          status: AuthStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onAvatarUpload(
      AuthAvatarUploadRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final user = await _repository.uploadAvatar(event.filePath);
      emit(state.copyWith(status: AuthStatus.authenticated, user: user));
    } catch (e) {
      emit(state.copyWith(
          status: AuthStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onAddressAdd(AuthAddressAddRequested event, Emitter<AuthState> emit) async {
    emit(state.copyWith(status: AuthStatus.loading));
    try {
      final addresses = await _repository.addSavedAddress(event.data);
      final updatedUser = state.user!.copyWith(savedAddresses: addresses);
      emit(state.copyWith(status: AuthStatus.authenticated, user: updatedUser));
    } catch (e) {
      emit(state.copyWith(status: AuthStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onAddressDelete(AuthAddressDeleteRequested event, Emitter<AuthState> emit) async {
    try {
      final addresses = await _repository.deleteSavedAddress(event.addressId);
      final updatedUser = state.user!.copyWith(savedAddresses: addresses);
      emit(state.copyWith(status: AuthStatus.authenticated, user: updatedUser));
    } catch (e) {
      emit(state.copyWith(status: AuthStatus.failure, errorMessage: e.toString()));
    }
  }

  Future<void> _onAddressSetDefault(AuthAddressSetDefaultRequested event, Emitter<AuthState> emit) async {
    try {
      final addresses = await _repository.setDefaultAddress(event.addressId);
      final updatedUser = state.user!.copyWith(savedAddresses: addresses);
      emit(state.copyWith(status: AuthStatus.authenticated, user: updatedUser));
    } catch (e) {
      emit(state.copyWith(status: AuthStatus.failure, errorMessage: e.toString()));
    }
  }
}
