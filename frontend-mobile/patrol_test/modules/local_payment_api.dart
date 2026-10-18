import 'package:dio/dio.dart';
import 'package:toko_mart/core/config/api_config.dart';

import '../test_credentials.dart';

const localPaymentVerificationEnabled =
    bool.fromEnvironment('LOCAL_PAYMENT_VERIFICATION');
const localPaymentProductName = 'The Art of Programming';
const localPaymentSecondProductName = 'Local Verification Second Seller';

/// API setup and assertions shared by the opt-in local Stripe UI tests.
/// Payment confirmation and buyer/seller actions still run through the UI.
final class LocalPaymentApi {
  LocalPaymentApi() {
    requireLocalApi();
  }

  final Dio _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
  ));

  static void requireLocalApi() {
    final uri = Uri.parse(ApiConfig.baseUrl);
    if (uri.scheme != 'http' || uri.host != '10.0.2.2' || uri.port != 5001) {
      throw StateError(
          'Isolated local verification API on emulator port 5001 required');
    }
  }

  Future<void> loginBuyer() async {
    final response = await _dio.post('/auth/login', data: {
      'email': TestCredentials.buyerEmail,
      'password': TestCredentials.password,
    });
    _dio.options.headers['Authorization'] = 'Bearer ${response.data['token']}';
  }

  Future<void> prepareCart(Set<String> productNames) async {
    final selected = <dynamic>[];
    var page = 1;
    var pages = 1;
    do {
      final response =
          await _dio.get('/products', queryParameters: {'page': page});
      final products = response.data['products'] as List;
      selected.addAll(
          products.where((product) => productNames.contains(product['name'])));
      pages = (response.data['pages'] as num).toInt();
      page += 1;
    } while (page <= pages);
    if (selected.length != productNames.length) {
      throw StateError('Local seller fixture products missing or duplicated');
    }
    await _dio.put('/cart', data: {
      'items': selected
          .map((product) => {
                'productId': product['_id'],
                'quantity': 1,
                'isSelected': true,
              })
          .toList(),
    });
  }

  Future<String> savedCardId() async {
    final cards = (await _dio.get('/auth/payment-methods')).data['data']
        ['paymentMethods'] as List;
    if (cards.isEmpty) throw StateError('A saved Stripe test card is required');
    return cards.first['_id'].toString();
  }

  Future<List<Map<String, dynamic>>> orders() async {
    final response = await _dio.get('/orders');
    return (response.data['orders'] as List)
        .map((order) => Map<String, dynamic>.from(order as Map))
        .toList();
  }

  Future<Set<String>> orderIds() async =>
      (await orders()).map((order) => order['_id'].toString()).toSet();

  Future<void> verifyAuthorizedOrders({
    required Set<String> previousOrderIds,
    required int sellerCount,
  }) async {
    final created = (await orders())
        .where((order) => !previousOrderIds.contains(order['_id']))
        .toList();
    if (created.length != sellerCount ||
        created.any((order) =>
            order['paymentStatus'] != 'authorized' ||
            order['paymentFlowVersion'] != 'manual_capture')) {
      throw StateError(
          'Expected one authorized manual-capture order per seller');
    }
    for (final order in created) {
      // IDs correlate UI results with Stripe test records; never print secrets.
      // ignore: avoid_print
      print('LOCAL_MOBILE_ORDER ${order['_id']} ${order['paymentIntentId']}');
    }
  }

  Future<void> waitForCapture(String orderId) async {
    final deadline = DateTime.now().add(const Duration(seconds: 30));
    while (true) {
      final order =
          (await orders()).firstWhere((order) => order['_id'] == orderId);
      if (order['status'] == 'preparing' &&
          order['paymentStatus'] == 'captured') {
        return;
      }
      if (DateTime.now().isAfter(deadline)) {
        throw StateError('Seller acceptance did not capture payment');
      }
      // Capture is asynchronous; poll the server until completion or timeout.
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }
  }

  void close() => _dio.close();
}
