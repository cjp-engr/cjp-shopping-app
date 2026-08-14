// TC-620: Seller deletes variant product from dashboard (mobile Delete)

import 'package:toko_mart/keys.dart';

import '../modules/api_clients.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-620: seller deletes variant product from dashboard',
      tags: ['delete-product-variant', 'seller', 'product-delete'], ($, modules) async {
    // Setup
    final api = SellerApiClient();
    await api.login(TestCredentials.sellerEmail, TestCredentials.password);
    final productId = await api.createVariantProduct('E2E Delete Test Tee');

    // UI test
    await modules.auth.login(
      email: TestCredentials.sellerEmail,
      password: TestCredentials.password,
    );

    await modules.seller.navigateToDashboard();

    // Confirm product exists before delete
    await $(keys.seller.productTile(productId)).waitUntilVisible();

    // Delete
    await modules.seller.tapDeleteProduct(productId);
    await modules.seller.confirmDelete();

    // Assert: tile no longer present — wait for dashboard to settle, then check
    await $(keys.seller.dashboardScreen).waitUntilVisible();
    if ($(keys.seller.productTile(productId)).exists) {
      throw StateError('Product tile should not exist after deletion: $productId');
    }
    // No API teardown needed — UI already deleted the product
  });
}
