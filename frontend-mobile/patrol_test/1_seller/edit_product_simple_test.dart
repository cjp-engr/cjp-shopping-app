// TC-616: Seller edits simple product from dashboard (mobile Update)

import 'package:toko_mart/keys.dart';

import '../modules/api_clients.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-616: seller edits simple product from dashboard',
      tags: ['edit-product-simple', 'seller', 'product-update'],
      ($, modules) async {
    const updatedName = 'E2E Edited Lamp';
    const updatedPrice = '39.99';

    // Setup
    final api = SellerApiClient();
    await api.login(TestCredentials.sellerEmail, TestCredentials.password);
    final productId = await api.createSimpleProduct('E2E Edit Test Lamp');

    // UI test
    await modules.auth.login(
      email: TestCredentials.sellerEmail,
      password: TestCredentials.password,
    );

    await modules.seller.navigateToDashboard();
    await modules.seller.tapEditProduct(productId);

    // Wizard opens in edit mode — update Basic Info (step 0)
    await $(keys.seller.wizardProductNameField).enterText(updatedName);
    await $(keys.seller.wizardNextButton).tap();

    // Step 1 — Pricing: update price
    await $(keys.seller.wizardPriceField).enterText(updatedPrice);
    await $(keys.seller.wizardNextButton).tap();

    // Step 2 — Description: skip
    await $(keys.seller.wizardNextButton).tap();

    // Step 3 — Images: add image via camera (required)
    await modules.seller.addImageViaCamera();

    // Step 4 — Shipping: skip
    await $(keys.seller.wizardNextButton).tap();

    // Step 5 — Publish
    await modules.seller.publish();

    // Assert: updated name visible on dashboard tile
    await $(keys.seller.productTile(productId)).waitUntilVisible();
    await $('E2E Edited Lamp').waitUntilVisible();

    // Teardown
    await api.deleteProduct(productId);
  });
}
