import 'package:dio/dio.dart';
import '../models/public_user_model.dart';
import '../../../../core/network/api_client.dart';

class FollowRemoteDataSource {
  final Dio _dio;

  FollowRemoteDataSource(this._dio);

  Future<PublicUserModel> getUserProfile(String userId) async {
    try {
      final response = await _dio.get('/users/$userId');
      return PublicUserModel.fromJson(
          response.data['user'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<PublicUserModel>> searchUsers(String query) async {
    try {
      final response = await _dio.get('/users',
          queryParameters: query.trim().isNotEmpty ? {'q': query.trim()} : null);
      final raw = response.data['users'] as List;
      return raw
          .map((u) => PublicUserModel.fromJson(u as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<({bool isFollowing, int followersCount})> followUser(
      String userId) async {
    try {
      final response = await _dio.post('/users/$userId/follow');
      return (
        isFollowing: response.data['isFollowing'] as bool,
        followersCount: (response.data['followersCount'] as num).toInt(),
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<({bool isFollowing, int followersCount})> unfollowUser(
      String userId) async {
    try {
      final response = await _dio.delete('/users/$userId/follow');
      return (
        isFollowing: response.data['isFollowing'] as bool,
        followersCount: (response.data['followersCount'] as num).toInt(),
      );
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<PublicUserModel>> getFollowers(String userId) async {
    try {
      final response = await _dio.get('/users/$userId/followers');
      final raw = response.data['users'] as List;
      return raw
          .map((u) => PublicUserModel.fromJson(u as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Future<List<PublicUserModel>> getFollowing(String userId) async {
    try {
      final response = await _dio.get('/users/$userId/following');
      final raw = response.data['users'] as List;
      return raw
          .map((u) => PublicUserModel.fromJson(u as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}
