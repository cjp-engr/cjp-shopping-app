import 'package:flutter/widgets.dart';

class _OrdersKey extends ValueKey<String> {
  const _OrdersKey(String value) : super('orders_$value');
}

class OrdersKeys {
  final cancelOrderButton = const _OrdersKey('cancelOrderButton');
  final checkoutCardHolderField = const _OrdersKey('checkoutCardHolderField');
  final checkoutCardNumberField = const _OrdersKey('checkoutCardNumberField');
  final checkoutCityField = const _OrdersKey('checkoutCityField');
  final checkoutNewAddressOption = const _OrdersKey('checkoutNewAddressOption');
  final checkoutStateField = const _OrdersKey('checkoutStateField');
  final checkoutStreetField = const _OrdersKey('checkoutStreetField');
  final checkoutZipField = const _OrdersKey('checkoutZipField');
  // ignore: library_private_types_in_public_api
  _OrdersKey orderCard(String id) => _OrdersKey('orderCard_$id');
  final ordersNavTab = const _OrdersKey('ordersNavTab');
  final ordersScreen = const _OrdersKey('ordersScreen');
  final paymentNewCardTab = const _OrdersKey('paymentNewCardTab');
  // ignore: library_private_types_in_public_api
  _OrdersKey paymentNoticeTitle(String title) =>
      _OrdersKey('paymentNoticeTitle_$title');
  // ignore: library_private_types_in_public_api
  _OrdersKey paymentOption(String type) => _OrdersKey('paymentOption_$type');
  final paymentSavedCardsTab = const _OrdersKey('paymentSavedCardsTab');
  final paymentSubmitButton = const _OrdersKey('paymentSubmitButton');
  final placeOrderButton = const _OrdersKey('placeOrderButton');
  // ignore: library_private_types_in_public_api
  _OrdersKey savedPaymentCard(String id) => _OrdersKey('savedPaymentCard_$id');
}
