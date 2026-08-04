import 'package:flutter/widgets.dart';

class _OrdersKey extends ValueKey<String> {
  const _OrdersKey(String value) : super('orders_$value');
}

class OrdersKeys {
  final checkoutCardHolderField = const _OrdersKey('checkoutCardHolderField');
  final checkoutCardNumberField = const _OrdersKey('checkoutCardNumberField');
  final checkoutCityField = const _OrdersKey('checkoutCityField');
  final checkoutStateField = const _OrdersKey('checkoutStateField');
  final checkoutStreetField = const _OrdersKey('checkoutStreetField');
  final checkoutZipField = const _OrdersKey('checkoutZipField');
  final ordersScreen = const _OrdersKey('ordersScreen');
  final paymentNewCardTab = const _OrdersKey('paymentNewCardTab');
  _OrdersKey paymentOption(String type) => _OrdersKey('paymentOption_$type');
  final placeOrderButton = const _OrdersKey('placeOrderButton');
}
