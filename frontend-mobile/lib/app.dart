import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_cubit.dart';
import 'core/network/api_client.dart';
import 'shared/services/storage_service.dart';
import 'routes/app_router.dart';

// Features - Auth
import 'features/auth/data/datasources/auth_remote_datasource.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/auth/presentation/bloc/auth_event.dart';
import 'features/auth/presentation/bloc/auth_state.dart';

// Features - Products
import 'features/products/data/datasources/product_remote_datasource.dart';
import 'features/products/data/repositories/product_repository_impl.dart';
import 'features/products/presentation/bloc/product_bloc.dart';

// Features - Cart
import 'features/cart/data/cart_remote_datasource.dart';
import 'features/cart/presentation/bloc/cart_bloc.dart';
import 'features/cart/presentation/bloc/cart_event.dart';

// Features - Orders
import 'features/orders/data/datasources/order_remote_datasource.dart';
import 'features/orders/data/repositories/order_repository_impl.dart';
import 'features/orders/presentation/bloc/order_bloc.dart';

// Features - Wishlist
import 'features/wishlist/presentation/bloc/wishlist_bloc.dart';

// Features - Seller
import 'features/seller/data/datasources/seller_remote_datasource.dart';
import 'features/seller/data/repositories/seller_repository_impl.dart';
import 'features/seller/presentation/bloc/seller_bloc.dart';

class TokoMart extends StatefulWidget {
  final StorageService storageService;
  const TokoMart({super.key, required this.storageService});

  @override
  State<TokoMart> createState() => _TokoMartState();
}

class _TokoMartState extends State<TokoMart> {
  late final ApiClient _apiClient;
  late final AuthBloc _authBloc;

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient(widget.storageService);

    // Auth
    final authDs = AuthRemoteDataSource(_apiClient.dio);
    final authRepo = AuthRepositoryImpl(authDs, widget.storageService);
    _authBloc = AuthBloc(authRepo, widget.storageService)
      ..add(AuthCheckRequested());
  }

  @override
  void dispose() {
    _authBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Products
    final productDs = ProductRemoteDataSource(_apiClient.dio);
    final productRepo = ProductRepositoryImpl(productDs);

    // Orders
    final orderDs = OrderRemoteDataSource(_apiClient.dio);
    final orderRepo = OrderRepositoryImpl(orderDs);

    // Seller
    final sellerDs = SellerRemoteDataSource(_apiClient.dio);
    final sellerRepo = SellerRepositoryImpl(sellerDs);

    // Cart
    final cartDs = CartRemoteDataSource(_apiClient.dio);
    final cartBloc = CartBloc(cartDs);

    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => ThemeCubit()),
        BlocProvider.value(value: _authBloc),
        BlocProvider(create: (_) => ProductBloc(productRepo)),
        BlocProvider.value(value: cartBloc),
        BlocProvider(create: (_) => WishlistBloc()),
        BlocProvider(create: (_) => OrderBloc(orderRepo)),
        BlocProvider(create: (_) => SellerBloc(sellerRepo)),
      ],
      child: _RouterWrapper(authBloc: _authBloc, cartBloc: cartBloc),
    );
  }
}

class _NoStretchScrollBehavior extends MaterialScrollBehavior {
  const _NoStretchScrollBehavior();

  @override
  Widget buildOverscrollIndicator(BuildContext context, Widget child, ScrollableDetails details) => child;
}

class _RouterWrapper extends StatefulWidget {
  final AuthBloc authBloc;
  final CartBloc cartBloc;
  const _RouterWrapper({required this.authBloc, required this.cartBloc});

  @override
  State<_RouterWrapper> createState() => _RouterWrapperState();
}

class _RouterWrapperState extends State<_RouterWrapper> {
  late final router = createRouter(widget.authBloc);

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listenWhen: (p, c) => p.status != c.status,
      listener: (_, authState) {
        if (authState.status == AuthStatus.authenticated) {
          widget.cartBloc.add(CartLoadRequested());
        } else if (authState.status == AuthStatus.unauthenticated) {
          widget.cartBloc.add(CartCleared());
        }
      },
      child: BlocBuilder<ThemeCubit, ThemeMode>(
        builder: (context, themeMode) {
          return MaterialApp.router(
            title: 'TokoMart',
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: themeMode,
            routerConfig: router,
            debugShowCheckedModeBanner: false,
            scrollBehavior: const _NoStretchScrollBehavior(),
          );
        },
      ),
    );
  }
}
