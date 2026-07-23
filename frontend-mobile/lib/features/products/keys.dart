import 'package:flutter/widgets.dart';

class _ProductsKey extends ValueKey<String> {
  const _ProductsKey(String value) : super('products_$value');
}

class ProductsKeys {
  final homeScreen = const _ProductsKey('homeScreen');
  final searchField = const _ProductsKey('searchField');
}
