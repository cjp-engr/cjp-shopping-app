import '../entities/user_entity.dart';

abstract class AuthRepository {
  Future<({UserEntity user, String token})> login(String email, String password);
  Future<({UserEntity user, String token})> signup({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  });
  Future<UserEntity> getMe();
  Future<UserEntity> updateProfile(Map<String, dynamic> data);
  Future<UserEntity> uploadAvatar(String filePath);
  Future<void> logout();
}
