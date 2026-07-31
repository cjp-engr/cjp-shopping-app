import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/theme/theme_colors.dart';
import '../../features/cart/presentation/bloc/cart_bloc.dart';
import '../../features/cart/presentation/bloc/cart_state.dart';
import '../../features/wishlist/presentation/bloc/wishlist_bloc.dart';
import '../../features/wishlist/presentation/bloc/wishlist_state.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/bloc/auth_state.dart';
import '../services/notification_service.dart';

class MainShell extends StatefulWidget {
  final Widget child;
  final Dio dio;
  const MainShell({super.key, required this.child, required this.dio});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  Timer? _pollTimer;
  Set<String> _knownOrderIds = {};
  bool _initialized = false;

  int _toReceiveCount = 0;
  Timer? _ordersBadgeTimer;

  @override
  void initState() {
    super.initState();
    NotificationService.onTap = (payload) {
      if (mounted && payload == 'seller_orders_tab') {
        context.go('/seller?tab=orders');
      }
    };
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationService.instance.requestPermissions();
      // Auth bloc is guaranteed to have user data by first frame.
      _maybeStartPolling();
      _maybeFetchToReceiveCount();
    });
    _ordersBadgeTimer = Timer.periodic(
      const Duration(seconds: 60),
      (_) => _maybeFetchToReceiveCount(),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _ordersBadgeTimer?.cancel();
    super.dispose();
  }

  void _maybeFetchToReceiveCount() {
    final authState = context.read<AuthBloc>().state;
    if (authState.status != AuthStatus.authenticated) return;
    if (authState.user?.isSeller ?? false) return; // sellers use the seller dashboard
    _fetchToReceiveCount();
  }

  Future<void> _fetchToReceiveCount() async {
    try {
      final res = await widget.dio.get('/orders');
      final data = res.data;
      final List<dynamic> orders =
          data is Map ? (data['orders'] ?? data['data'] ?? []) : (data as List);
      final count =
          orders.whereType<Map>().where((o) => o['status'] == 'shipped').length;
      if (mounted) setState(() => _toReceiveCount = count);
    } catch (_) {}
  }

  void _maybeStartPolling() {
    final authState = context.read<AuthBloc>().state;
    if (authState.status != AuthStatus.authenticated) return;
    if (authState.user?.isSeller != true) return;
    _startPolling();
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _initialized = false;
    _knownOrderIds = {};
    _poll();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) => _poll());
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _poll() async {
    try {
      final res = await widget.dio.get('/seller/orders');
      final data = res.data;
      final List<dynamic> orders =
          data is Map ? (data['orders'] ?? data['data'] ?? []) : (data as List);

      final currentIds = {
        for (final o in orders)
          if (o is Map && o['_id'] != null) o['_id'].toString()
      };

      if (!_initialized) {
        _knownOrderIds = currentIds;
        _initialized = true;
        return;
      }

      final newIds = currentIds.difference(_knownOrderIds);
      _knownOrderIds = currentIds;

      if (newIds.isNotEmpty && mounted) {
        _showOrderNotification(newIds.length);
      }
    } catch (_) {
      // ignore network errors
    }
  }

  void _showOrderNotification(int count) {
    NotificationService.instance.showOrderNotification(count);
  }

  int _selectedIndex(String location, bool isSeller) {
    if (location.startsWith('/wishlist')) return 2;
    if (location.startsWith('/orders')) return 1;
    if (isSeller) {
      if (location.startsWith('/seller')) return 3;
      if (location.startsWith('/profile')) return 4;
    } else {
      if (location.startsWith('/profile')) return 3;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final surfaceColor = context.surfaceColor;
    final borderColor = context.borderColor;

    return BlocListener<AuthBloc, AuthState>(
      // Listen to any user change — covers login, logout, and role changes.
      listenWhen: (p, c) => p.user != c.user,
      listener: (_, authState) {
        if (authState.user?.isSeller == true) {
          _startPolling();
          // Clear buyer badge when a seller account is active.
          if (mounted) setState(() => _toReceiveCount = 0);
        } else {
          _stopPolling();
          _maybeFetchToReceiveCount();
        }
      },
      child: Scaffold(
        body: widget.child,
        bottomNavigationBar: BlocBuilder<AuthBloc, AuthState>(
          buildWhen: (p, c) => p.user?.role != c.user?.role,
          builder: (context, authState) {
            final isSeller = authState.user?.isSeller ?? false;
            final index = _selectedIndex(location, isSeller);

            return BlocBuilder<CartBloc, CartState>(
              builder: (context, cart) {
                return BlocBuilder<WishlistBloc, WishlistState>(
                  builder: (context, wishlist) {
                    final wishlistCount = wishlist.items.length;
                    return Container(
                      decoration: BoxDecoration(
                        color: surfaceColor,
                        border: Border(top: BorderSide(color: borderColor)),
                      ),
                      child: SafeArea(
                        child: SizedBox(
                          height: 62,
                          child: Row(
                            children: [
                              _NavItem(
                                icon: Icons.home_outlined,
                                activeIcon: Icons.home_rounded,
                                isActive: index == 0,
                                onTap: () => context.go('/'),
                              ),
                              _NavItem(
                                icon: Icons.grid_view_outlined,
                                activeIcon: Icons.grid_view_rounded,
                                isActive: index == 1,
                                badge: _toReceiveCount > 0
                                    ? _toReceiveCount
                                    : null,
                                onTap: () {
                                  _fetchToReceiveCount();
                                  context.go('/orders');
                                },
                              ),
                              _NavItem(
                                icon: Icons.favorite_border_rounded,
                                activeIcon: Icons.favorite_rounded,
                                isActive: index == 2,
                                badge: wishlistCount > 0 ? wishlistCount : null,
                                onTap: () => context.go('/wishlist'),
                              ),
                              if (isSeller)
                                _NavItem(
                                  icon: Icons.storefront_outlined,
                                  activeIcon: Icons.storefront_rounded,
                                  isActive: index == 3,
                                  onTap: () => context.go('/seller'),
                                ),
                              _NavItem(
                                icon: Icons.person_outline_rounded,
                                activeIcon: Icons.person_rounded,
                                isActive: isSeller ? index == 4 : index == 3,
                                onTap: () => context.go('/profile'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final bool isActive;
  final int? badge;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.isActive,
    required this.onTap,
    this.badge,
  });

  @override
  Widget build(BuildContext context) {
    final inactiveColor = context.onSurfaceMuted;

    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  isActive ? activeIcon : icon,
                  color: isActive ? AppColors.primary : inactiveColor,
                  size: 26,
                ),
                if (badge != null)
                  Positioned(
                    right: -6,
                    top: -4,
                    child: Container(
                      width: 16,
                      height: 16,
                      decoration: const BoxDecoration(
                        color: AppColors.danger,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '$badge',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w800),
                      ),
                    ),
                  ),
              ],
            ),
            if (isActive) ...[
              const SizedBox(height: 4),
              Container(
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
