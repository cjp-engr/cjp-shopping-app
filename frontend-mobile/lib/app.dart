import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/theme/app_theme.dart';
import 'core/network/api_client.dart';
import 'shared/services/storage_service.dart';
import 'routes/app_router.dart';

// Features - Auth
import 'features/auth/data/datasources/auth_remote_datasource.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/auth/presentation/bloc/auth_event.dart';

// Features - Products
import 'features/products/data/datasources/product_remote_datasource.dart';
import 'features/products/data/repositories/product_repository_impl.dart';
import 'features/products/presentation/bloc/product_bloc.dart';

// Features - Cart
import 'features/cart/presentation/bloc/cart_bloc.dart';

// Features - Orders
import 'features/orders/data/datasources/order_remote_datasource.dart';
import 'features/orders/data/repositories/order_repository_impl.dart';
import 'features/orders/presentation/bloc/order_bloc.dart';

// Features - Wishlist
import 'features/wishlist/presentation/bloc/wishlist_bloc.dart';

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

    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _authBloc),
        BlocProvider(create: (_) => ProductBloc(productRepo)),
        BlocProvider(create: (_) => CartBloc()),
        BlocProvider(create: (_) => WishlistBloc()),
        BlocProvider(create: (_) => OrderBloc(orderRepo)),
      ],
      child: _RouterWrapper(authBloc: _authBloc),
    );
  }
}

class _RouterWrapper extends StatefulWidget {
  final AuthBloc authBloc;
  const _RouterWrapper({required this.authBloc});

  @override
  State<_RouterWrapper> createState() => _RouterWrapperState();
}

class _RouterWrapperState extends State<_RouterWrapper> {
  late final router = createRouter(widget.authBloc);

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'TokoMart',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
