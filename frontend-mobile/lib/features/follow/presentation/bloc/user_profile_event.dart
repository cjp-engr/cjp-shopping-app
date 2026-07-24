import 'package:equatable/equatable.dart';

sealed class UserProfileEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

final class UserProfileLoadRequested extends UserProfileEvent {
  final String userId;
  UserProfileLoadRequested(this.userId);
  @override
  List<Object?> get props => [userId];
}

final class UserProfileFollowToggled extends UserProfileEvent {
  final String targetUserId;
  final bool currentlyFollowing;
  UserProfileFollowToggled({
    required this.targetUserId,
    required this.currentlyFollowing,
  });
  @override
  List<Object?> get props => [targetUserId, currentlyFollowing];
}

final class UserProfileFollowersRequested extends UserProfileEvent {
  final String userId;
  UserProfileFollowersRequested(this.userId);
  @override
  List<Object?> get props => [userId];
}

final class UserProfileFollowingRequested extends UserProfileEvent {
  final String userId;
  UserProfileFollowingRequested(this.userId);
  @override
  List<Object?> get props => [userId];
}

final class UserProfileTabUserFollowToggled extends UserProfileEvent {
  final String targetUserId;
  final bool currentlyFollowing;
  UserProfileTabUserFollowToggled({
    required this.targetUserId,
    required this.currentlyFollowing,
  });
  @override
  List<Object?> get props => [targetUserId, currentlyFollowing];
}
