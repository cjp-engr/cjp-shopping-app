import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:mocktail/mocktail.dart';
import 'package:toko_mart/features/refunds/data/refund_api.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';
import 'package:toko_mart/features/refunds/presentation/refund_bloc.dart';

class FakeApi extends Mock implements RefundApi {}

Future<void> settle(RefundBloc bloc) async {
  await Future<void>.delayed(const Duration(milliseconds: 30));
  expect(bloc.state.busy, isFalse);
}

void main() {
  late FakeApi api;
  setUp(() {
    api = FakeApi();
    when(() => api.eligibility('o')).thenAnswer((_) async =>
        RefundEligibility.fromJson({
          'eligible': true,
          'requestsEnabled': true,
          'currency': 'usd',
          'lines': []
        }));
    when(() => api.history('o')).thenAnswer((_) async => []);
  });
  test('keeps the same key and selection after an uncertain submission',
      () async {
    final sent = <Map<String, dynamic>>[];
    when(() => api.submit('o', any())).thenAnswer((call) async {
      sent.add(Map<String, dynamic>.from(call.positionalArguments[1] as Map));
      if (sent.length == 1) {
        throw const RefundFailure('Interrupted', uncertain: true);
      }
      return RefundRequestData.fromJson(
          {'id': 'r', 'state': 'requested', 'units': []});
    });
    final bloc = RefundBloc(api, orderId: 'o');
    bloc.add(SubmitRefund({'a': 1}, 'damaged', 'Broken'));
    await settle(bloc);
    expect(bloc.state.retryPending, isTrue);
    bloc.add(SubmitRefund({'a': 2}, 'other', 'Different'));
    await settle(bloc);
    expect(sent[0], sent[1]);
    expect(bloc.state.retryPending, isFalse);
    expect(bloc.state.mutations, 1);
    await bloc.close();
  });
  test('rejects blank rejection explanations before any API decision',
      () async {
    final bloc = RefundBloc(api);
    bloc.add(DecideRefund('r', 'reject', ' '));
    await settle(bloc);
    verifyNever(() => api.decide(any(), any(), any()));
    expect(bloc.state.error, isNotNull);
    await bloc.close();
  });
  test('preserves saved request success if subsequent refresh fails', () async {
    when(() => api.submit('o', any())).thenAnswer((_) async =>
        RefundRequestData.fromJson(
            {'id': 'r', 'state': 'requested', 'units': []}));
    when(() => api.history('o')).thenThrow(
        DioException(requestOptions: RequestOptions(), message: 'network'));
    final bloc = RefundBloc(api, orderId: 'o');
    bloc.add(SubmitRefund({'a': 1}, 'damaged', 'Broken'));
    await settle(bloc);
    expect(bloc.state.retryPending, isFalse);
    expect(bloc.state.mutations, 1);
    expect(bloc.state.error, contains('saved'));
    await bloc.close();
  });
}
