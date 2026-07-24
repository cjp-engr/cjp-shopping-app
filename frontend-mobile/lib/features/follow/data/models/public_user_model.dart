import '../../domain/entities/public_user_entity.dart';

class PublicUserModel extends PublicUserEntity {
  const PublicUserModel({
    required super.id,
    required super.firstName,
    required super.lastName,
    super.avatar,
    required super.role,
    required super.followersCount,
    required super.followingCount,
    required super.isFollowing,
  });

  factory PublicUserModel.fromJson(Map<String, dynamic> json) =>
      PublicUserModel(
        id: json['id'] as String,
        firstName: json['firstName'] as String,
        lastName: json['lastName'] as String,
        avatar: json['avatar'] as String?,
        role: json['role'] as String,
        followersCount: (json['followersCount'] as num).toInt(),
        followingCount: (json['followingCount'] as num).toInt(),
        isFollowing: json['isFollowing'] as bool,
      );
}
