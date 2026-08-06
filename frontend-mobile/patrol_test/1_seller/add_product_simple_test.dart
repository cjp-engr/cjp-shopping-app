// TC-090: Seller creates simple product via 7-step wizard on mobile

import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-090: seller creates simple product via wizard',
      tags: ['add-product-simple', 'seller', 'smoke'], ($, modules) async {
    // Fixed product — deterministic across runs; matches seeded catalog name
    const product = (
      name: 'Lamp',
      category: 'Home & Garden',
      price: 29.99,
      stock: 10,
      description: 'A beautiful test lamp for home decor.'
    );
    await modules.auth.login(
      email: TestCredentials.sellerEmail,
      password: TestCredentials.password,
    );

    // Navigate to seller dashboard via bottom nav
    await $(keys.seller.sellerNavTab).tap();
    await $(keys.seller.dashboardScreen).waitUntilVisible();

    // Open add-product wizard
    await $(keys.seller.addProductFab).tap();

    // Step 0 — Basic Info
    await $(keys.seller.wizardProductNameField)
        .enterText('E2E Test ${product.name} - Test');
    await $(keys.seller.wizardCategorySelector).tap();
    await $(keys.seller.categorySheetItem(product.category)).tap();
    await $(keys.seller.wizardBrandField).enterText('Brand Test');
    await $(keys.seller.wizardNextButton).tap();

    // Step 1 — Pricing
    await $(keys.seller.wizardPriceField).enterText('${product.price}');
    await $(keys.seller.wizardStockField).enterText('${product.stock}');
    await $(keys.seller.wizardSkuField).enterText('E2E-${product.name}-SKU');
    await $(keys.seller.wizardDiscountField).enterText('10');
    await $(keys.seller.wizardNextButton).tap();

    // Step 2 — Description
    await $(keys.seller.wizardDescriptionField).enterText(product.description);
    await $(keys.seller.wizardTagsField).enterText('testTagOnly');
    await $(keys.seller.wizardAddTagButton).tap();
    await $(keys.seller.wizardNextButton).tap();

    // Step 3 — Images: take a photo
    await $(keys.seller.wizardAddImageTile).tap();
    await $(keys.seller.wizardCameraOption).tap();
    await $(keys.widgets.dialogConfirmButton).tap();
    await $.platform.mobile.grantPermissionWhenInUse();
    await $.platform.mobile
        .tap(Selector(resourceId: 'com.android.camera2:id/shutter_button'));
    await $.platform.mobile
        .tap(Selector(resourceId: 'com.android.camera2:id/done_button'));
    await $(keys.seller.wizardNextButton).tap();

    // Step 4 — Shipping
    await $(keys.seller.wizardExpressButton).tap();
    await $(keys.seller.wizardPickupButton).tap();

    await $(keys.seller.wizardBuyerPaysButton).tap();

    await $(keys.seller.wizardShippingFeeField('standard')).enterText('10');
    await $(keys.seller.wizardShippingFeeField('express')).enterText('15');
    await $(keys.seller.wizardShippingFeeField('pickup')).enterText('5');

    await $(keys.seller.wizardNextButton).tap();

    // Step 5 — Review: publish
    await $(keys.seller.wizardPublishButton).tap();

    // Assert: back on seller dashboard
    await $(keys.seller.dashboardScreen).waitUntilVisible();
  });
}
