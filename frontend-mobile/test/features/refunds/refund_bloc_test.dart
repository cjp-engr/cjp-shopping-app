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
  test(
      'seller list opens on In Progress, switches group from page 1, and keeps the counts',
      () async {
    SellerRefundPage page(String state, int pageNo) =>
        SellerRefundPage.fromJson({
          'page': pageNo,
          'pages': 2,
          'total': 2,
          'counts': {'in_progress': 1, 'approved': 4, 'rejected': 0},
          'requests': [
            {'id': '$state$pageNo', 'state': state, 'units': []}
          ]
        });
    when(() => api.sellerList(1, 'in_progress'))
        .thenAnswer((_) async => page('requested', 1));
    when(() => api.sellerList(2, 'in_progress'))
        .thenAnswer((_) async => page('requested', 2));
    when(() => api.sellerList(1, 'approved'))
        .thenAnswer((_) async => page('processing', 1));
    final bloc = RefundBloc(api);

    bloc.add(LoadRefunds());
    await settle(bloc);
    expect(bloc.state.group, 'in_progress');
    expect(bloc.state.requests.single.id, 'requested1');
    expect(bloc.state.counts, {'in_progress': 1, 'approved': 4, 'rejected': 0});

    bloc.add(LoadRefunds(page: 2));
    await settle(bloc);
    expect(bloc.state.page, 2);
    expect(bloc.state.group, 'in_progress');

    bloc.add(LoadRefunds(group: 'approved'));
    await settle(bloc);
    expect(bloc.state.group, 'approved');
    expect(bloc.state.page, 1);
    expect(bloc.state.requests.single.id, 'processing1');
    expect(bloc.state.counts['approved'], 4);
    verify(() => api.sellerList(1, 'approved')).called(1);
  });
  test('loads more seller requests by appending, and stops at the last page',
      () async {
    SellerRefundPage page(int n, int pages) => SellerRefundPage.fromJson({
          'page': n,
          'pages': pages,
          'total': 3,
          'counts': {'in_progress': 3, 'approved': 0, 'rejected': 0},
          'requests': [
            {'id': 'r$n', 'state': 'requested', 'units': []}
          ]
        });
    when(() => api.sellerList(1, 'in_progress'))
        .thenAnswer((_) async => page(1, 2));
    when(() => api.sellerList(2, 'in_progress'))
        .thenAnswer((_) async => page(2, 2));
    final bloc = RefundBloc(api);

    bloc.add(LoadRefunds());
    await settle(bloc);
    bloc.add(LoadMoreRefunds());
    await settle(bloc);

    expect(bloc.state.requests.map((r) => r.id), ['r1', 'r2']);
    expect(bloc.state.page, 2);
    expect(bloc.state.loadingMore, isFalse);

    bloc.add(LoadMoreRefunds());
    await settle(bloc);

    verify(() => api.sellerList(2, 'in_progress')).called(1);
    verifyNever(() => api.sellerList(3, 'in_progress'));
    expect(bloc.state.requests, hasLength(2));
  });

  test(
      'a decision reloads the list from page 1 instead of keeping a scrolled page',
      () async {
    SellerRefundPage page(int n) => SellerRefundPage.fromJson({
          'page': n,
          'pages': 2,
          'total': 2,
          'counts': {'in_progress': 2, 'approved': 0, 'rejected': 0},
          'requests': [
            {'id': 'r$n', 'state': 'requested', 'units': []}
          ]
        });
    when(() => api.sellerList(1, 'in_progress'))
        .thenAnswer((_) async => page(1));
    when(() => api.sellerList(2, 'in_progress'))
        .thenAnswer((_) async => page(2));
    when(() => api.decide('r1', 'approve', any())).thenAnswer((_) async =>
        RefundRequestData.fromJson(
            {'id': 'r1', 'state': 'processing', 'units': []}));
    final bloc = RefundBloc(api);
    bloc.add(LoadRefunds());
    await settle(bloc);
    bloc.add(LoadMoreRefunds());
    await settle(bloc);

    bloc.add(DecideRefund('r1', 'approve'));
    await settle(bloc);

    expect(bloc.state.page, 1);
    expect(bloc.state.requests.map((r) => r.id), ['r1']);
    verify(() => api.sellerList(1, 'in_progress')).called(2);
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
