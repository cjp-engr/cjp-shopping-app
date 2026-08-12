// TC-615: Seller views simple product in seller dashboard (mobile Read)

import 'package:toko_mart/keys.dart';

import '../modules/api_clients.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-615: seller views simple product in dashboard',
      tags: ['read-product-simple', 'seller', 'product-read'], ($, modules) async {
    // Setup — create product via API so the test is independent of TC-090
    final api = SellerApiClient();
    await api.login(TestCredentials.sellerEmail, TestCredentials.password);
    final productId = await api.createSimpleProduct('E2E Read Test Lamp');

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

    // Assert: product detail screen loaded
    await $('E2E Read Test Lamp').waitUntilVisible();

    // Teardown
    await api.deleteProduct(productId);
  });
}
