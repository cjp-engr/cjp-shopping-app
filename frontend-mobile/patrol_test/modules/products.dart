import 'package:flutter_test/flutter_test.dart' show find;
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import 'module.dart';

final class Products extends Module {
  Products(super.$);

  Future<void> _searchProduct(String productName) async {
    await $(keys.products.searchField).enterText(productName);
    await $.pump(const Duration(milliseconds: 600));
  }

  Future<void> addSimpleProductToCart(String productName) async {
    await _searchProduct(productName);
    await $(keys.products.productCard(productName))
        .scrollTo(view: find.byKey(keys.products.productList))
        .tap();
    await $(keys.products.addToCartButton).tap();
  }

  Future<void> addVariantProductToCart(
    String productName, {
    String attr = 'Size',
    String value = 'M',
  }) async {
    await _searchProduct(productName);
    await $(keys.products.productCard(productName))
        .scrollTo(view: find.byKey(keys.products.productList))
        .tap();
    await $(keys.products.variantValue(attr, value)).scrollTo().tap();
    await $(keys.products.addToCartButton).tap();
  }

  Future<void> navigateToCart() async {
    await $(keys.products.productDetailCartIconButton).tap();
  }
}
