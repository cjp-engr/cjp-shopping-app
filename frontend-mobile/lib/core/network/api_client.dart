import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../shared/services/storage_service.dart';

// Android emulator: 10.0.2.2 → host localhost
// iOS simulator: 127.0.0.1
// Real device: your machine's LAN IP
const String _baseUrl = 'http://10.0.2.2:5000/api';

class ApiClient {
  static ApiClient? _instance;
  late final Dio dio;

  ApiClient._internal(StorageService storage) {
    dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    dio.interceptors.addAll([
      _AuthInterceptor(storage),
      if (kDebugMode) _LoggingInterceptor(),
    ]);
  }

  factory ApiClient(StorageService storage) {
    _instance ??= ApiClient._internal(storage);
    return _instance!;
  }

  static void reset() => _instance = null;
}

class _AuthInterceptor extends Interceptor {
  final StorageService _storage;
  _AuthInterceptor(this._storage);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _storage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

class _LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    debugPrint('→ ${options.method} ${options.path}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    debugPrint('← ${response.statusCode} ${response.requestOptions.path}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint('✗ ${err.response?.statusCode} ${err.requestOptions.path}: ${err.message}');
    handler.next(err);
  }
}

String mapDioError(DioException e) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'Connection timeout. Please try again.';
    case DioExceptionType.connectionError:
      return 'No internet connection.';
    case DioExceptionType.badResponse:
      final data = e.response?.data;
      if (data is Map && data['message'] != null) {
        return data['message'].toString();
      }
      final code = e.response?.statusCode ?? 0;
      if (code == 401) return 'Session expired. Please sign in again.';
      if (code == 404) return 'Resource not found.';
      if (code >= 500) return 'Server error. Please try again later.';
      return 'Request failed ($code).';
    default:
      return 'Something went wrong. Please try again.';
  }
}
