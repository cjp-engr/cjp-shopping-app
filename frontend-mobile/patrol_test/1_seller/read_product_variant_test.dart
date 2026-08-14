// TC-618: Seller views variant product in seller dashboard (mobile Read)

import 'package:toko_mart/keys.dart';

import '../modules/api_clients.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-618: seller views variant product in dashboard',
      tags: ['read-product-variant', 'seller', 'product-read'], ($, modules) async {
    // Setup — create variant product via API
    final api = SellerApiClient();
    await api.login(TestCredentials.sellerEmail, TestCredentials.password);
    final productId = await api.createVariantProduct('E2E Read Test Tee');

    // UI test
    await modules.auth.login(
      email: TestCredentials.sellerEmail,
      password: TestCredentials.password,
    );

    await modules.seller.navigateToDashboard();

    // Assert: product tile visible on dashboard
    await $(keys.seller.productTile(productId)).waitUntilVisible();

    // Navigate into product detail
    await modules.seller.tapProductTile(productId);

    // Assert: product detail screen shows name and variant selectors
    await $('E2E Read Test Tee').waitUntilVisible();
    await modules.seller.expectVariantOptionsVisible(['S', 'M', 'L']);

    // Teardown
    await api.deleteProduct(productId);
  });
}
