import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/follow_remote_datasource.dart';
import 'user_profile_event.dart';
import 'user_profile_state.dart';

class UserProfileBloc extends Bloc<UserProfileEvent, UserProfileState> {
  final FollowRemoteDataSource _ds;

  UserProfileBloc(this._ds) : super(const UserProfileState()) {
    on<UserProfileLoadRequested>(_onLoad);
    on<UserProfileFollowToggled>(_onFollowToggle);
    on<UserProfileFollowersRequested>(_onLoadFollowers);
    on<UserProfileFollowingRequested>(_onLoadFollowing);
    on<UserProfileTabUserFollowToggled>(_onTabFollowToggle);
  }

  Future<void> _onLoad(
      UserProfileLoadRequested event, Emitter<UserProfileState> emit) async {
    emit(state.copyWith(status: UserProfileStatus.loading));
    try {
      final user = await _ds.getUserProfile(event.userId);
      emit(state.copyWith(status: UserProfileStatus.loaded, user: user));
      // Auto-load followers tab
      add(UserProfileFollowersRequested(event.userId));
    } catch (e) {
      emit(state.copyWith(
          status: UserProfileStatus.error, errorMessage: e.toString()));
    }
  }

  Future<void> _onFollowToggle(
      UserProfileFollowToggled event, Emitter<UserProfileState> emit) async {
    if (state.user == null) return;
    try {
      final result = event.currentlyFollowing
          ? await _ds.unfollowUser(event.targetUserId)
          : await _ds.followUser(event.targetUserId);
      final updated = state.user!.copyWith(
        isFollowing: result.isFollowing,
        followersCount: result.followersCount,
      );
      emit(state.copyWith(user: updated));
    } catch (_) {
      // Ignore — keep current state
    }
  }

  Future<void> _onLoadFollowers(
      UserProfileFollowersRequested event, Emitter<UserProfileState> emit) async {
    emit(state.copyWith(tabLoading: true));
    try {
      final users = await _ds.getFollowers(event.userId);
      emit(state.copyWith(tabUsers: users, tabLoading: false));
    } catch (_) {
      emit(state.copyWith(tabLoading: false));
    }
  }

  Future<void> _onLoadFollowing(
      UserProfileFollowingRequested event, Emitter<UserProfileState> emit) async {
    emit(state.copyWith(tabLoading: true));
    try {
      final users = await _ds.getFollowing(event.userId);
      emit(state.copyWith(tabUsers: users, tabLoading: false));
    } catch (_) {
      emit(state.copyWith(tabLoading: false));
    }
  }

  Future<void> _onTabFollowToggle(
      UserProfileTabUserFollowToggled event,
      Emitter<UserProfileState> emit) async {
    try {
      final result = event.currentlyFollowing
          ? await _ds.unfollowUser(event.targetUserId)
          : await _ds.followUser(event.targetUserId);
      final updated = state.tabUsers.map((u) {
        if (u.id == event.targetUserId) {
          return u.copyWith(
            isFollowing: result.isFollowing,
            followersCount: result.followersCount,
          );
        }
        return u;
      }).toList();
      emit(state.copyWith(tabUsers: updated));
    } catch (_) {
      // Ignore
    }
  }
}
