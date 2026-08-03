import 'package:flutter/widgets.dart';

class _CartKey extends ValueKey<String> {
  const _CartKey(String value) : super('cart_$value');
}

class CartKeys {
  final checkoutButton = const _CartKey('checkoutButton');
}
