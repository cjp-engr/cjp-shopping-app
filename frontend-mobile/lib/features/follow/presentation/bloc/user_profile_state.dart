import 'package:equatable/equatable.dart';
import '../../domain/entities/public_user_entity.dart';

enum UserProfileStatus { initial, loading, loaded, error }

class UserProfileState extends Equatable {
  final UserProfileStatus status;
  final PublicUserEntity? user;
  final List<PublicUserEntity> tabUsers;
  final bool tabLoading;
  final String? errorMessage;

  const UserProfileState({
    this.status = UserProfileStatus.initial,
    this.user,
    this.tabUsers = const [],
    this.tabLoading = false,
    this.errorMessage,
  });

  UserProfileState copyWith({
    UserProfileStatus? status,
    PublicUserEntity? user,
    List<PublicUserEntity>? tabUsers,
    bool? tabLoading,
    String? errorMessage,
  }) =>
      UserProfileState(
        status: status ?? this.status,
        user: user ?? this.user,
        tabUsers: tabUsers ?? this.tabUsers,
        tabLoading: tabLoading ?? this.tabLoading,
        errorMessage: errorMessage ?? this.errorMessage,
      );

  @override
  List<Object?> get props =>
      [status, user, tabUsers, tabLoading, errorMessage];
}
