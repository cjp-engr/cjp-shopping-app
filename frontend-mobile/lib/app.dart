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

// Features - Follow
import 'features/follow/data/datasources/follow_remote_datasource.dart';
import 'package:dio/dio.dart';

class TokoMart extends StatefulWidget {
  final StorageService storageService;
  const TokoMart({super.key, required this.storageService});

  @override
  State<TokoMart> createState() => _TokoMartState();
}

class _TokoMartState extends State<TokoMart> {
  late final ApiClient _apiClient;
  late final AuthBloc _authBloc;
  late final CartBloc _cartBloc;
  late final ProductBloc _productBloc;
  late final OrderBloc _orderBloc;
  late final SellerBloc _sellerBloc;
  late final FollowRemoteDataSource _followDs;

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient(widget.storageService);

    // Auth
    final authDs = AuthRemoteDataSource(_apiClient.dio);
    final authRepo = AuthRepositoryImpl(authDs, widget.storageService);
    _authBloc = AuthBloc(authRepo, widget.storageService)
      ..add(AuthCheckRequested());

    // Products
    final productRepo = ProductRepositoryImpl(ProductRemoteDataSource(_apiClient.dio));
    _productBloc = ProductBloc(productRepo);

    // Orders
    final orderRepo = OrderRepositoryImpl(OrderRemoteDataSource(_apiClient.dio));
    _orderBloc = OrderBloc(orderRepo);

    // Seller
    final sellerRepo = SellerRepositoryImpl(SellerRemoteDataSource(_apiClient.dio));
    _sellerBloc = SellerBloc(sellerRepo);

    // Cart
    _cartBloc = CartBloc(CartRemoteDataSource(_apiClient.dio));

    // Follow
    _followDs = FollowRemoteDataSource(_apiClient.dio);
  }

  @override
  void dispose() {
    _authBloc.close();
    _cartBloc.close();
    _productBloc.close();
    _orderBloc.close();
    _sellerBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => ThemeCubit()),
        BlocProvider.value(value: _authBloc),
        BlocProvider.value(value: _productBloc),
        BlocProvider.value(value: _cartBloc),
        BlocProvider(create: (_) => WishlistBloc()),
        BlocProvider.value(value: _orderBloc),
        BlocProvider.value(value: _sellerBloc),
      ],
      child: _RouterWrapper(authBloc: _authBloc, cartBloc: _cartBloc, followDs: _followDs, dio: _apiClient.dio),
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
  final FollowRemoteDataSource followDs;
  final Dio dio;
  const _RouterWrapper({required this.authBloc, required this.cartBloc, required this.followDs, required this.dio});

  @override
  State<_RouterWrapper> createState() => _RouterWrapperState();
}

class _RouterWrapperState extends State<_RouterWrapper> {
  late final router = createRouter(widget.authBloc, followDs: widget.followDs, dio: widget.dio);


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
