import 'package:dio/dio.dart';
import '../models/user_model.dart';
import '../../../../core/network/api_client.dart';

class AuthRemoteDataSource {
  final Dio _dio;

  AuthRemoteDataSource(this._dio);

  Future<({UserModel user, String token})> login(
      String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = response.data as Map<String, dynamic>;
      return (
        user: UserModel.fromJson(data['user'] as Map<String, dynamic>),
        token: data['token'] as String,
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<({UserModel user, String token})> signup({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    try {
      final response = await _dio.post('/auth/signup', data: {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
      });
      final data = response.data as Map<String, dynamic>;
      return (
        user: UserModel.fromJson(data['user'] as Map<String, dynamic>),
        token: data['token'] as String,
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<UserModel> getMe() async {
    try {
      final response = await _dio.get('/auth/me');
      return UserModel.fromJson(response.data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/auth/profile', data: data);
      return UserModel.fromJson(response.data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}
