// TC-619: Seller edits variant product from dashboard (mobile Update)

import 'package:toko_mart/keys.dart';

import '../modules/api_clients.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-619: seller edits variant product from dashboard',
      tags: ['edit-product-variant', 'seller', 'product-update'],
      ($, modules) async {
    const updatedName = 'E2E Edited Tee';
    const updatedMPrice = '34.99';

    // Setup
    final api = SellerApiClient();
    await api.login(TestCredentials.sellerEmail, TestCredentials.password);
    final productId = await api.createVariantProduct('E2E Edit Test Tee');

    // UI test
    await modules.auth.login(
      email: TestCredentials.sellerEmail,
      password: TestCredentials.password,
    );

    await modules.seller.navigateToDashboard();
    await modules.seller.tapEditProduct(productId);

    // Step 0 — Basic Info: update name
    await $(keys.seller.wizardProductNameField).enterText(updatedName);
    await modules.seller.advanceWizardStep();

    // Step 1 — Variants: update M variant price (29.99 → 34.99 per scenario)
    await modules.seller.updateVariantPrice('M', updatedMPrice);
    await modules.seller.advanceWizardStep();

    // Step 2 — Description: skip
    await modules.seller.advanceWizardStep();

    // Step 3 — Images: add image via link (required)
    await modules.seller.addImageViaLink();

    // Step 4 — Shipping: skip
    await modules.seller.advanceWizardStep();

    // Step 5 — Publish
    await modules.seller.publish();

    // Assert: updated name visible on dashboard tile
    await $(keys.seller.productTile(productId)).waitUntilVisible();
    await modules.seller.expectProductNameOnDashboard(updatedName);

    // Assert: variant price persisted via API
    final product = await api.getProduct(productId);
    final mPrice = api.variantPrice(product, 'M');
    if (mPrice == null || mPrice != 34.99) {
      throw StateError('Expected Size M price 34.99, got $mPrice');
    }

    // Teardown
    await api.deleteProduct(productId);
  });
}
