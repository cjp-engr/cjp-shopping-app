// TC-619: Seller edits variant product from dashboard (mobile Update)
import 'package:flutter/rendering.dart';
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import '../modules/api_clients.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-619: seller edits variant product from dashboard',
      tags: ['edit-product-variant', 'seller', 'product-update'],
      ($, modules) async {
    const updatedName = 'E2E Edited Tee';
    const updatedMPrice = '49.99';

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
    await $(keys.seller.wizardNextButton).tap();

    // Step 1 — Variants: update M variant price
    await $(keys.seller.wizardVariantPriceField('M'))
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
    await $(keys.seller.wizardVariantPriceField('M')).enterText(updatedMPrice);
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
    await $('E2E Edited Tee').waitUntilVisible();

    // Teardown
    await api.deleteProduct(productId);
  });
}
