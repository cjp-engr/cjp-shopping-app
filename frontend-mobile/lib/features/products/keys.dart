import 'package:flutter/widgets.dart';

class _ProductsKey extends ValueKey<String> {
  const _ProductsKey(String value) : super('products_$value');
}

class ProductsKeys {
  final addToCartButton = const _ProductsKey('addToCartButton');
  final cartIconButton = const _ProductsKey('cartIconButton');
  final homeScreen = const _ProductsKey('homeScreen');
  final productDetailCartIconButton =
      const _ProductsKey('productDetailCartIconButton');
  _ProductsKey productCard(String name) => _ProductsKey('productCard_$name');
  final productList = const _ProductsKey('productList');
  final searchField = const _ProductsKey('searchField');
}
