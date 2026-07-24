import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../domain/entities/public_user_entity.dart';
import '../bloc/user_profile_bloc.dart';
import '../bloc/user_profile_event.dart';
import '../bloc/user_profile_state.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class UserProfileScreen extends StatefulWidget {
  final String userId;
  const UserProfileScreen({super.key, required this.userId});

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChange);
  }

  void _onTabChange() {
    if (_tabController.indexIsChanging) return;
    final bloc = context.read<UserProfileBloc>();
    if (_tabController.index == 0) {
      bloc.add(UserProfileFollowersRequested(widget.userId));
    } else {
      bloc.add(UserProfileFollowingRequested(widget.userId));
    }
  }

  @override
  void dispose() {
    _tabController
      ..removeListener(_onTabChange)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId =
        context.select((AuthBloc b) => b.state.user?.id);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<UserProfileBloc, UserProfileState>(
        builder: (context, state) {
          if (state.status == UserProfileStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.status == UserProfileStatus.error || state.user == null) {
            return _ErrorView(message: state.errorMessage ?? 'User not found');
          }
          final user = state.user!;
          final isOwn = currentUserId == user.id;

          return NestedScrollView(
            headerSliverBuilder: (_, __) => [
              SliverToBoxAdapter(
                child: _ProfileHeader(
                  user: user,
                  isOwn: isOwn,
                  onFollowTap: () {
                    context.read<UserProfileBloc>().add(
                          UserProfileFollowToggled(
                            targetUserId: user.id,
                            currentlyFollowing: user.isFollowing,
                          ),
                        );
                  },
                ),
              ),
              SliverPersistentHeader(
                pinned: true,
                delegate: _TabBarDelegate(
                  TabBar(
                    controller: _tabController,
                    labelColor: AppColors.primary,
                    unselectedLabelColor: AppColors.textSecondary,
                    indicatorColor: AppColors.primary,
                    indicatorSize: TabBarIndicatorSize.label,
                    labelStyle: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                    tabs: [
                      Tab(text: 'Followers (${user.followersCount})'),
                      Tab(text: 'Following (${user.followingCount})'),
                    ],
                  ),
                ),
              ),
            ],
            body: TabBarView(
              controller: _tabController,
              children: [
                _UserList(
                  users: state.tabUsers,
                  loading: state.tabLoading,
                  currentUserId: currentUserId,
                  emptyMessage: 'No followers yet',
                ),
                _UserList(
                  users: state.tabUsers,
                  loading: state.tabLoading,
                  currentUserId: currentUserId,
                  emptyMessage: 'Not following anyone yet',
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ─── Profile Header ───────────────────────────────────────────────────────────

class _ProfileHeader extends StatelessWidget {
  final PublicUserEntity user;
  final bool isOwn;
  final VoidCallback onFollowTap;

  const _ProfileHeader({
    required this.user,
    required this.isOwn,
    required this.onFollowTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(AppSizes.lg),
      child: Column(
        children: [
          // Avatar
          user.avatar != null
              ? CircleAvatar(
                  radius: 44,
                  backgroundImage: NetworkImage(user.avatar!),
                )
              : CircleAvatar(
                  radius: 44,
                  backgroundColor: AppColors.primaryLight,
                  child: Text(
                    user.initials,
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
          const SizedBox(height: 12),

          // Name
          Text(
            user.fullName,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 6),

          // Role badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: user.isSeller
                  ? const Color(0xFFFEF3C7)
                  : AppColors.primaryLight,
              borderRadius: BorderRadius.circular(AppSizes.radiusFull),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  user.isSeller
                      ? Icons.storefront_rounded
                      : Icons.shopping_bag_outlined,
                  size: 13,
                  color: user.isSeller
                      ? const Color(0xFFD97706)
                      : AppColors.primary,
                ),
                const SizedBox(width: 4),
                Text(
                  user.isSeller ? 'Seller' : 'Buyer',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: user.isSeller
                        ? const Color(0xFFD97706)
                        : AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSizes.lg),

          // Stats row
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _StatChip(label: 'Followers', count: user.followersCount),
              Container(
                height: 32,
                width: 1,
                color: Theme.of(context).dividerColor,
                margin: const EdgeInsets.symmetric(horizontal: AppSizes.lg),
              ),
              _StatChip(label: 'Following', count: user.followingCount),
            ],
          ),
          const SizedBox(height: AppSizes.lg),

          // Follow / Unfollow button
          if (!isOwn)
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: user.isFollowing
                      ? Theme.of(context).colorScheme.surfaceContainerHighest
                      : AppColors.primary,
                  foregroundColor: user.isFollowing
                      ? colorScheme.onSurface
                      : Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(AppSizes.radiusMd),
                  ),
                ),
                onPressed: onFollowTap,
                icon: Icon(
                  user.isFollowing
                      ? Icons.person_remove_rounded
                      : Icons.person_add_rounded,
                  size: 18,
                ),
                label: Text(
                  user.isFollowing ? 'Unfollow' : 'Follow',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final int count;
  const _StatChip({required this.label, required this.count});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

// ─── User List ────────────────────────────────────────────────────────────────

class _UserList extends StatelessWidget {
  final List<PublicUserEntity> users;
  final bool loading;
  final String? currentUserId;
  final String emptyMessage;

  const _UserList({
    required this.users,
    required this.loading,
    required this.currentUserId,
    required this.emptyMessage,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (users.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.people_outline_rounded,
                size: 48, color: AppColors.textMuted),
            const SizedBox(height: 8),
            Text(emptyMessage,
                style: const TextStyle(color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: AppSizes.sm),
      itemCount: users.length,
      separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
      itemBuilder: (context, i) {
        final user = users[i];
        final isOwn = currentUserId == user.id;
        return _UserTile(
          user: user,
          isOwn: isOwn,
          onFollowTap: () => context.read<UserProfileBloc>().add(
                UserProfileTabUserFollowToggled(
                  targetUserId: user.id,
                  currentlyFollowing: user.isFollowing,
                ),
              ),
          onTap: () => context.push('/users/${user.id}'),
        );
      },
    );
  }
}

class _UserTile extends StatelessWidget {
  final PublicUserEntity user;
  final bool isOwn;
  final VoidCallback onFollowTap;
  final VoidCallback onTap;

  const _UserTile({
    required this.user,
    required this.isOwn,
    required this.onFollowTap,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding:
          const EdgeInsets.symmetric(horizontal: AppSizes.md, vertical: 4),
      onTap: onTap,
      leading: user.avatar != null
          ? CircleAvatar(backgroundImage: NetworkImage(user.avatar!), radius: 22)
          : CircleAvatar(
              radius: 22,
              backgroundColor: AppColors.primaryLight,
              child: Text(
                user.initials,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ),
      title: Text(
        user.fullName,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        user.isSeller ? 'Seller' : 'Buyer',
        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
      ),
      trailing: isOwn
          ? null
          : GestureDetector(
              onTap: onFollowTap,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: user.isFollowing
                      ? Colors.transparent
                      : AppColors.primary,
                  border: Border.all(
                    color: user.isFollowing
                        ? AppColors.borderStrong
                        : AppColors.primary,
                  ),
                  borderRadius:
                      BorderRadius.circular(AppSizes.radiusFull),
                ),
                child: Text(
                  user.isFollowing ? 'Unfollow' : 'Follow',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: user.isFollowing
                        ? AppColors.textSecondary
                        : Colors.white,
                  ),
                ),
              ),
            ),
    );
  }
}

// ─── Error View ───────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  final String message;
  const _ErrorView({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.person_off_rounded,
              size: 56, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(message,
              style: const TextStyle(color: AppColors.textSecondary)),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => context.pop(),
            child: const Text('Go back'),
          ),
        ],
      ),
    );
  }
}

// ─── Tab bar pinned header delegate ──────────────────────────────────────────

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  const _TabBarDelegate(this.tabBar);

  @override
  Widget build(
          BuildContext context, double shrinkOffset, bool overlapsContent) =>
      Container(
        color: Theme.of(context).scaffoldBackgroundColor,
        child: tabBar,
      );

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  bool shouldRebuild(_TabBarDelegate old) => tabBar != old.tabBar;
}
