import 'package:flutter/widgets.dart';

class _ProductsKey extends ValueKey<String> {
  const _ProductsKey(String value) : super('products_$value');
}

class ProductsKeys {
  final addToCartButton = const _ProductsKey('addToCartButton');
  final cartIconButton = const _ProductsKey('cartIconButton');
  final homeScreen = const _ProductsKey('homeScreen');
  _ProductsKey productCard(String name) => _ProductsKey('productCard_$name');
  final searchField = const _ProductsKey('searchField');
}
