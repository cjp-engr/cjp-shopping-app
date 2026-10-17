import 'package:dio/dio.dart';

import '../models/checkout_session_view.dart';

/// A failed checkout request. [code] is the backend's machine-readable reason (for example `authorization_rejected`).
class CheckoutApiException implements Exception {
  const CheckoutApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.retryable = false,
  });

  final String code;
  final String message;
  final int? statusCode;
  final bool retryable;

  @override
  String toString() => 'CheckoutApiException(code: $code, status: $statusCode)';
}

/// Calls the three checkout session endpoints. Responses use `{ success, data }`; errors use `{ success: false, error: { code } }`.
class CheckoutSessionApi {
  const CheckoutSessionApi(this._dio);

  final Dio _dio;

  /// Creates the session, or resumes it when the same [idempotencyKey] and body were used before (200).
  Future<({CheckoutSessionView session, bool replayed})> createSession({
    required Map<String, dynamic> payload,
    required String idempotencyKey,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        '/checkout/sessions',
        data: payload,
        options: Options(headers: {'Idempotency-Key': idempotencyKey}),
      );
      return (
        session: CheckoutSessionView.fromJson(_data(response.data)),
        replayed: response.statusCode == 200,
      );
    } on DioException catch (e) {
      throw _toException(e);
    }
  }

  Future<CheckoutSessionView> getSession(String sessionId) async {
    try {
      final response = await _dio.get<dynamic>('/checkout/sessions/$sessionId');
      return CheckoutSessionView.fromJson(_data(response.data));
    } on DioException catch (e) {
      throw _toException(e);
    }
  }

  /// Verifies every seller's hold and places the orders. Returns the placed order IDs.
  Future<List<String>> confirmSession(String sessionId) async {
    try {
      final response = await _dio.post<dynamic>('/checkout/sessions/$sessionId/confirm');
      final orders = _data(response.data)['orders'] as List? ?? const [];
      return orders
          .whereType<Map<String, dynamic>>()
          .map((order) => (order['id'] ?? '').toString())
          .where((id) => id.isNotEmpty)
          .toList();
    } on DioException catch (e) {
      throw _toException(e);
    }
  }

  static Map<String, dynamic> _data(dynamic body) {
    if (body is Map<String, dynamic>) {
      final data = body['data'];
      if (data is Map<String, dynamic>) return data;
      return body;
    }
    return <String, dynamic>{};
  }

  static CheckoutApiException _toException(DioException e) {
    final status = e.response?.statusCode;
    final body = e.response?.data;
    if (body is Map<String, dynamic>) {
      final error = body['error'];
      if (error is Map<String, dynamic>) {
        return CheckoutApiException(
          code: (error['code'] ?? 'unknown_error').toString(),
          message: (error['message'] ?? 'Checkout request failed').toString(),
          statusCode: status,
          retryable: error['retryable'] == true,
        );
      }
      return CheckoutApiException(
        code: 'unknown_error',
        message: (body['message'] ?? 'Checkout request failed').toString(),
        statusCode: status,
      );
    }
    return CheckoutApiException(
      code: status == null ? 'network_error' : 'unknown_error',
      message: 'Checkout request failed',
      statusCode: status,
    );
  }
}
