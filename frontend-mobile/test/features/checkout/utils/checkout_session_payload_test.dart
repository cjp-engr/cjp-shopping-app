import 'package:flutter_test/flutter_test.dart';
import 'package:toko_mart/features/checkout/utils/checkout_session_payload.dart';

void main() {
  Map<String, dynamic> orderData() => {
        'userId': 'buyer-1',
        'items': [
          {'productId': 'p1', 'quantity': 2, 'variantId': 'v1', 'selectedAttributes': {'Size': 'M'}},
        ],
        'shippingAddress': {'street': '1 Main St', 'city': 'Taipei', 'state': 'Taipei', 'zipCode': '100', 'country': 'PH'},
        'paymentMethod': {'type': 'credit-card'},
        'sellerMessages': {'s1': 'Gift wrap'},
        'couponCodes': {'s1': 'SAVE10'},
        'deliverySelections': {'s1': 'standard'},
        'contactEmail': 'buyer@example.com',
        'subtotal': 99.0,
        'tax': 7.92,
        'shipping': 9.99,
        'total': 116.91,
      };

  test('carries items, address, card type and the buyer choices', () {
    final payload = checkoutSessionPayload(orderData(), paymentType: 'credit-card');

    expect(payload, {
      'items': [
        {'productId': 'p1', 'quantity': 2, 'variantId': 'v1', 'selectedAttributes': {'Size': 'M'}},
      ],
      'shippingAddress': {'street': '1 Main St', 'city': 'Taipei', 'state': 'Taipei', 'zipCode': '100', 'country': 'PH'},
      'paymentMethod': {'type': 'credit-card'},
      'sellerMessages': {'s1': 'Gift wrap'},
      'couponCodes': {'s1': 'SAVE10'},
      'deliverySelections': {'s1': 'standard'},
    });
  });

  test('never carries client-computed amounts or contact details', () {
    final payload = checkoutSessionPayload(orderData(), paymentType: 'debit-card');

    for (final key in ['subtotal', 'tax', 'shipping', 'total', 'contactEmail', 'userId', 'amountInCents']) {
      expect(payload.containsKey(key), isFalse, reason: key);
    }
    expect(payload['paymentMethod'], {'type': 'debit-card'});
  });

  test('omits empty buyer choices rather than sending empty maps', () {
    final data = orderData()
      ..['sellerMessages'] = <String, String>{}
      ..['couponCodes'] = <String, String>{}
      ..['deliverySelections'] = <String, String>{};

    final payload = checkoutSessionPayload(data, paymentType: 'credit-card');

    expect(payload.containsKey('sellerMessages'), isFalse);
    expect(payload.containsKey('couponCodes'), isFalse);
    expect(payload.containsKey('deliverySelections'), isFalse);
  });

  test('an unrecognised card type is sent as a credit card', () {
    final payload = checkoutSessionPayload(orderData(), paymentType: 'paypal');

    expect(payload['paymentMethod'], {'type': 'credit-card'});
  });
}
