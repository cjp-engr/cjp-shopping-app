import 'package:dio/dio.dart';
import 'refund_models.dart';

class RefundFailure implements Exception {
  final String message;
  final bool uncertain;
  final int? status;
  final String? code;
  const RefundFailure(this.message,
      {this.uncertain = false, this.status, this.code});
}

class RefundApi {
  final Dio dio;
  RefundApi(this.dio);
  Future<SellerRefundPage> completed(int page) async =>
      SellerRefundPage.fromJson(await _request(
          '/orders/refund-requests/completed?page=$page&limit=20'));
  Future<Map<String, dynamic>> _request(String path,
      {String method = 'GET', Map<String, dynamic>? data}) async {
    try {
      final response =
          await dio.request(path, data: data, options: Options(method: method));
      if (response.data is! Map) {
        throw const RefundFailure(
            'Could not read the response. Refresh before retrying.',
            uncertain: true);
      }
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      final body = e.response?.data;
      final status = e.response?.statusCode;
      throw RefundFailure(
          body is Map && body['message'] is String
              ? body['message'] as String
              : 'Could not complete the request. Refresh before retrying.',
          status: status,
          code: body is Map ? body['code'] as String? : null,
          uncertain: status == null || status >= 500);
    }
  }

  Future<RefundEligibility> eligibility(String id) async =>
      RefundEligibility.fromJson(Map<String, dynamic>.from(
          (await _request('/orders/$id/refund-eligibility'))['eligibility']
              as Map));
  Future<List<RefundRequestData>> history(String id) async =>
      ((await _request('/orders/$id/refund-requests'))['requests'] as List)
          .map((r) =>
              RefundRequestData.fromJson(Map<String, dynamic>.from(r as Map)))
          .toList();
  Future<RefundRequestData> submit(
          String id, Map<String, dynamic> input) async =>
      RefundRequestData.fromJson(Map<String, dynamic>.from((await _request(
          '/orders/$id/refund-requests',
          method: 'POST',
          data: input))['request'] as Map));

  /// One order's refund requests in every state, for the refund history on the seller's order screen.
  Future<List<RefundRequestData>> sellerOrderRefunds(String orderId) async =>
      ((await _request('/seller/orders/$orderId/refund-requests'))['requests']
              as List)
          .map((r) =>
              RefundRequestData.fromJson(Map<String, dynamic>.from(r as Map)))
          .toList();

  /// [status] is `in_progress`, `approved` or `rejected`; omit it for every request.
  Future<SellerRefundPage> sellerList(int page, [String? status]) async =>
      SellerRefundPage.fromJson(await _request(
          '/seller/refund-requests?page=$page&limit=20${status == null ? '' : '&status=$status'}'));
  Future<RefundRequestData> decide(
          String id, String decision, String? reason) async =>
      RefundRequestData.fromJson(Map<String, dynamic>.from((await _request(
          '/seller/refund-requests/$id/decision',
          method: 'PUT',
          data: {
            'decision': decision,
            if (decision == 'reject') 'rejectionReason': reason
          }))['request'] as Map));
}
