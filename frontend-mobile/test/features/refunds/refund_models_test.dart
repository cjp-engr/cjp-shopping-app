import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/features/refunds/data/refund_models.dart';

void main() {
  test('shipping requires all remaining units and a seller-fault reason', () {
    final view = RefundEligibility.fromJson({
      'shippingRefundableMinor': 500,
      'lines': [
        {
          'lineId': 'a',
          'quantityAvailable': 2,
          'availableUnitAmountsMinor': [1080, 1079]
        }
      ]
    });
    expect(view.quote({'a': 1}, reason: 'damaged'), 1080);
    expect(view.quote({'a': 2}, reason: 'damaged'), 2659);
    expect(view.quote({'a': 2}, reason: 'other'), 2159);
    expect(view.shippingQuote({'a': 2}, 'wrong_item'), 500);
    expect(view.shippingQuote({'a': 3}, 'damaged'), 0);
    expect(refundReasons.containsKey('change_of_mind'), isFalse);
    expect(RefundRequestData.fromJson({'shippingMinor': 500}).shipping, 500);
    expect(RefundRequestData.fromJson({}).shipping, 0);
  });
  test('quotes selected unit amounts, keeping remainder cents deterministic',
      () {
    final view = RefundEligibility.fromJson({
      'eligible': true,
      'requestsEnabled': true,
      'currency': 'usd',
      'lines': [
        {
          'lineId': 'a',
          'productName': 'Mug',
          'quantityAvailable': 3,
          'availableUnitAmountsMinor': [34, 33, 33]
        },
      ]
    });
    expect(view.quote({'a': 2}), 67);
    expect(view.quote({'a': 4}), isNull);
    expect(view.quote({'other': 1}), isNull);
    expect(view.quote({'a': -1}), isNull);
  });
  test(
      'handles optional older fields and provider review states without promising settlement',
      () {
    final request = RefundRequestData.fromJson({
      'id': 'r',
      'state': 'needs_review',
      'amountMinor': 1080,
      'currency': 'usd',
      'units': []
    });
    expect(request.canDecide, isFalse);
    expect(request.stateLabel, 'Refund needs payment review');
    expect(RefundEligibility.fromJson({}).requestsEnabled, isFalse);
    expect(refundMoney(500, 'jpy'), contains('500'));
  });
}
