import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/core/utils/seller_shipping.dart';

void main() {
  group('sellerShippingFee', () {
    test('is free only when the seller sets free shipping', () {
      expect(sellerShippingFee(shippingFee: 'free'), 0);
    });

    test('charges the flat default fee when the seller set nothing', () {
      expect(sellerShippingFee(), defaultShippingFee);
      expect(sellerShippingFee(shippingFee: null), 9.99);
      expect(sellerShippingFee(shippingFee: ''), 9.99);
    });

    test('uses the fee of the selected delivery option for buyer-pays', () {
      const amounts = {'standard': 5.0, 'express': 12.0};
      expect(
          sellerShippingFee(
              shippingFee: 'buyer_pays',
              shippingFeeAmounts: amounts,
              selectedOption: 'express'),
          12);
      expect(
          sellerShippingFee(
              shippingFee: 'buyer_pays',
              shippingFeeAmounts: amounts,
              selectedOption: 'standard'),
          5);
    });

    test('falls back to the first configured fee when no option is selected '
        'or the option has no fee', () {
      const amounts = {'standard': 5.0};
      expect(
          sellerShippingFee(
              shippingFee: 'buyer_pays', shippingFeeAmounts: amounts),
          5);
      expect(
          sellerShippingFee(
              shippingFee: 'buyer_pays',
              shippingFeeAmounts: amounts,
              selectedOption: 'pickup'),
          5);
    });

    test('charges the default fee when buyer-pays has no fee configured', () {
      expect(
          sellerShippingFee(
              shippingFee: 'buyer_pays',
              shippingFeeAmounts: const {},
              selectedOption: 'standard'),
          defaultShippingFee);
      expect(sellerShippingFee(shippingFee: 'buyer_pays'), defaultShippingFee);
    });

    test('keeps an explicit zero fee set by the seller', () {
      expect(
          sellerShippingFee(
              shippingFee: 'buyer_pays',
              shippingFeeAmounts: const {'standard': 0.0},
              selectedOption: 'standard'),
          0);
    });
  });
}
