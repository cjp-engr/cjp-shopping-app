import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/features/seller/data/datasources/seller_remote_datasource.dart';
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

  test('HTTP 200 is completed', () async {
    stubPut(() async =>
        Response(requestOptions: options, statusCode: 200, data: {'success': true}));
    expect(await dataSource.updateOrderStatus('o1', 'preparing'),
        SellerStatusResult.completed);
  });

  test('HTTP 202 is resolving', () async {
    stubPut(() async =>
        Response(requestOptions: options, statusCode: 202, data: {'success': true}));
    expect(await dataSource.updateOrderStatus('o1', 'preparing'),
        SellerStatusResult.resolving);
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
              'message': 'Capture failed',
              'code': 'capture_failed'
            },
          ),
        ));
    await expectLater(
      dataSource.updateOrderStatus('o1', 'preparing'),
      throwsA(isA<SellerOrderException>()
          .having((e) => e.code, 'code', 'capture_failed')
          .having((e) => e.message, 'message', 'Capture failed')),
    );
  });

  test('a transport error stays a plain message', () async {
    stubPut(() async => throw DioException.connectionError(
        requestOptions: options, reason: 'offline'));
    await expectLater(
        dataSource.updateOrderStatus('o1', 'preparing'), throwsA('No internet connection.'));
  });
}
