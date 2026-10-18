/// Builds the checkout session request from the checkout's order data.
///
/// Carries only what the server needs to price the cart itself: items, the shipping address, the
/// card type, and the buyer's choices. No subtotal, tax, shipping or total is included, and neither
/// is any contact detail.
Map<String, dynamic> checkoutSessionPayload(
  Map<String, dynamic> orderData, {
  required String paymentType,
}) {
  final sellerMessages = orderData['sellerMessages'];
  final couponCodes = orderData['couponCodes'];
  final deliverySelections = orderData['deliverySelections'];
  return {
    'items': orderData['items'],
    'shippingAddress': orderData['shippingAddress'],
    'paymentMethod': {
      'type': paymentType == 'debit-card' ? 'debit-card' : 'credit-card',
    },
    if (_hasEntries(sellerMessages)) 'sellerMessages': sellerMessages,
    if (_hasEntries(couponCodes)) 'couponCodes': couponCodes,
    if (_hasEntries(deliverySelections)) 'deliverySelections': deliverySelections,
  };
}

bool _hasEntries(Object? value) => value is Map && value.isNotEmpty;
