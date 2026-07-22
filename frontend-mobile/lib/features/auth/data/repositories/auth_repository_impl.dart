import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../../../../shared/services/storage_service.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remote;
  final StorageService _storage;

  AuthRepositoryImpl(this._remote, this._storage);

  @override
  Future<({UserEntity user, String token})> login(
      String email, String password) async {
    final result = await _remote.login(email, password);
    await _storage.saveToken(result.token);
    await _storage.saveUserId(result.user.id);
    return (user: result.user, token: result.token);
  }

  @override
  Future<({UserEntity user, String token})> signup({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    final result = await _remote.signup(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
    );
    await _storage.saveToken(result.token);
    await _storage.saveUserId(result.user.id);
    return (user: result.user, token: result.token);
  }

  @override
  Future<UserEntity> getMe() => _remote.getMe();

  @override
  Future<UserEntity> updateProfile(Map<String, dynamic> data) =>
      _remote.updateProfile(data);

  @override
  Future<UserEntity> uploadAvatar(String filePath) =>
      _remote.uploadAvatar(filePath);

  @override
  Future<void> logout() async {
    await _storage.clear();
  }

  @override
  Future<List<SavedAddressEntity>> addSavedAddress(Map<String, dynamic> data) =>
      _remote.addSavedAddress(data);

  @override
  Future<List<SavedAddressEntity>> deleteSavedAddress(String id) =>
      _remote.deleteSavedAddress(id);

  @override
  Future<List<SavedAddressEntity>> setDefaultAddress(String id) =>
      _remote.setDefaultAddress(id);
}
