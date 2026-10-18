import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/features/seller/data/datasources/seller_remote_datasource.dart';
import 'package:toko_mart/features/seller/domain/seller_cancellation.dart';
import 'package:toko_mart/features/seller/domain/seller_status_result.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio dio;
  late SellerRemoteDataSource dataSource;
  final options = RequestOptions(path: '/seller/orders/o1/status');

  setUp(() {
    dio = MockDio();
    dataSource = SellerRemoteDataSource(dio);
  });

  void stubPut(Future<Response<dynamic>> Function() answer) {
    when(() => dio.put(any(), data: any(named: 'data')))
        .thenAnswer((_) => answer());
  }

  Response<dynamic> ok(Map<String, dynamic> data) =>
      Response(requestOptions: options, statusCode: 200, data: data);

  test('sends the cancelled status with the trimmed reason', () async {
    stubPut(() async => ok({'success': true}));

    await dataSource.cancelOrder('o1', '  Out of stock  ');

    verify(() => dio.put('/seller/orders/o1/status',
        data: {'status': 'cancelled', 'cancelReason': 'Out of stock'})).called(1);
  });

  test('reads the payment outcome of a card cancellation', () async {
    for (final entry in {
      'pending': SellerPaymentOperation.pending,
      'completed': SellerPaymentOperation.completed,
      'needs_review': SellerPaymentOperation.needsReview,
    }.entries) {
      stubPut(() async => ok({
            'success': true,
            'paymentOperation': {'status': entry.key},
          }));
      final outcome = await dataSource.cancelOrder('o1', 'x');
      expect(outcome.paymentOperation, entry.value, reason: entry.key);
    }
  });

  test('a cancellation without a payment outcome (COD) has none', () async {
    stubPut(() async => ok({'success': true}));

    expect((await dataSource.cancelOrder('o1', 'x')).paymentOperation, isNull);
  });

  test('an error body surfaces its code and message', () async {
    stubPut(() async => throw DioException.badResponse(
          statusCode: 409,
          requestOptions: options,
          response: Response(
            requestOptions: options,
            statusCode: 409,
            data: {
              'success': false,
              'message': 'Order accepted',
              'code': 'cancellation_conflict'
            },
          ),
        ));

    await expectLater(
      dataSource.cancelOrder('o1', 'x'),
      throwsA(isA<SellerOrderException>()
          .having((e) => e.code, 'code', 'cancellation_conflict')
          .having((e) => e.message, 'message', 'Order accepted')),
    );
  });

  test('a transport error stays a plain message', () async {
    stubPut(() async => throw DioException.connectionError(
        requestOptions: options, reason: 'offline'));

    await expectLater(
        dataSource.cancelOrder('o1', 'x'), throwsA('No internet connection.'));
  });
}
