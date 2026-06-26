import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/presentation/bloc/auth_bloc.dart';
import '../features/auth/presentation/bloc/auth_state.dart';
import '../features/auth/presentation/screens/login_screen.dart';
import '../features/auth/presentation/screens/signup_screen.dart';
import '../features/products/presentation/screens/products_screen.dart';
import '../features/products/presentation/screens/product_detail_screen.dart';
import '../features/cart/presentation/screens/cart_screen.dart';
import '../features/orders/presentation/screens/orders_screen.dart';
import '../features/orders/presentation/screens/order_detail_screen.dart';
import '../features/orders/presentation/screens/checkout_screen.dart';
import '../features/profile/presentation/screens/profile_screen.dart';
import '../features/wishlist/presentation/screens/wishlist_screen.dart';
import '../features/seller/presentation/screens/seller_dashboard_screen.dart';
import '../features/seller/presentation/screens/add_edit_product_screen.dart';
import '../features/products/domain/entities/product_entity.dart';
import '../features/products/presentation/screens/seller_profile_screen.dart';
import '../shared/widgets/main_shell.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter(AuthBloc authBloc) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    debugLogDiagnostics: false,
    redirect: (context, state) {
      final authState = authBloc.state;
      final isAuthRoute = state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/signup');

      if (authState.status == AuthStatus.initial) return null;

      if (authState.status == AuthStatus.unauthenticated && !isAuthRoute) {
        return '/login';
      }
      if (authState.status == AuthStatus.authenticated && isAuthRoute) {
        return '/';
      }
      return null;
    },
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    routes: [
      // Auth routes (no shell)
      GoRoute(
        path: '/login',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const SignupScreen(),
      ),
      // Cart & checkout (no shell)
      GoRoute(
        path: '/cart',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const CartScreen(),
      ),
      GoRoute(
        path: '/checkout',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) => CheckoutScreen(
          selectedIds: (state.extra as Set<String>?) ?? const {},
        ),
      ),
      GoRoute(
        path: '/products/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) =>
            ProductDetailScreen(productId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/orders/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) => OrderDetailScreen(
          orderId: state.pathParameters['id']!,
          sellerKey: state.uri.queryParameters['seller'],
        ),
      ),
      GoRoute(
        path: '/seller-profile/:sellerId',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) =>
            SellerProfileScreen(sellerId: state.pathParameters['sellerId']!),
      ),
      GoRoute(
        path: '/seller/add',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, __) => const AddEditProductScreen(),
      ),
      GoRoute(
        path: '/seller/edit/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (_, state) =>
            AddEditProductScreen(product: state.extra as ProductEntity?),
      ),
      // Shell with bottom nav
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, __, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (_, __) => const ProductsScreen(),
          ),
          GoRoute(
            path: '/orders',
            builder: (_, __) => const OrdersScreen(),
          ),
          GoRoute(
            path: '/wishlist',
            builder: (_, __) => const WishlistScreen(),
          ),
          GoRoute(
            path: '/seller',
            builder: (_, __) => const SellerDashboardScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (_, __) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
}

class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    _sub = stream.listen((_) => notifyListeners());
  }

  late final dynamic _sub;

  @override
  void dispose() {
    _sub.cancel();
    super.dispose();
  }
}
