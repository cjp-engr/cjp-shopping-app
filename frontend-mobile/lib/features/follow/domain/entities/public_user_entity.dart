import 'package:equatable/equatable.dart';

class PublicUserEntity extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String? avatar;
  final String role;
  final int followersCount;
  final int followingCount;
  final bool isFollowing;

  const PublicUserEntity({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.avatar,
    required this.role,
    required this.followersCount,
    required this.followingCount,
    required this.isFollowing,
  });

  String get fullName => '$firstName $lastName';
  bool get isSeller => role == 'seller';
  String get initials => '${firstName[0]}${lastName[0]}';

  PublicUserEntity copyWith({
    int? followersCount,
    int? followingCount,
    bool? isFollowing,
  }) =>
      PublicUserEntity(
        id: id,
        firstName: firstName,
        lastName: lastName,
        avatar: avatar,
        role: role,
        followersCount: followersCount ?? this.followersCount,
        followingCount: followingCount ?? this.followingCount,
        isFollowing: isFollowing ?? this.isFollowing,
      );

  @override
  List<Object?> get props =>
      [id, firstName, lastName, avatar, role, followersCount, followingCount, isFollowing];
}
