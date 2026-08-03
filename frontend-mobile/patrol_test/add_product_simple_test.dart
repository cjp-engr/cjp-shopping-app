// TC-090: Seller creates simple product via 7-step wizard on mobile

import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import 'test_app.dart';

void main() {
  testApp('TC-090: seller creates simple product via wizard',
      ($, modules) async {
    await modules.auth.login(
      email: const String.fromEnvironment('EMAIL'),
      password: const String.fromEnvironment('PASSWORD'),
    );

    // Navigate to seller dashboard via bottom nav
    await $(keys.seller.sellerNavTab).tap();
    await $(keys.seller.dashboardScreen).waitUntilVisible();

    // Open add-product wizard
    await $(keys.seller.addProductFab).tap();

    // Step 0 — Basic Info
    await $(keys.seller.wizardProductNameField).enterText('E2E Test Lamp');
    await $(keys.seller.wizardCategorySelector).tap();
    await $(keys.seller.categorySheetItem('Home & Garden')).tap();
    await $(keys.seller.wizardNextButton).tap();

    // Step 1 — Pricing
    await $(keys.seller.wizardPriceField).enterText('29.99');
    await $(keys.seller.wizardStockField).enterText('10');
    await $(keys.seller.wizardNextButton).tap();

    // Step 2 — Description
    await $(keys.seller.wizardDescriptionField)
        .enterText('A beautiful test lamp for home decor.');
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

    // Step 4 — Shipping (Standard pre-selected)
    await $(keys.seller.wizardNextButton).tap();

    // Step 5 — Review: publish
    await $(keys.seller.wizardPublishButton).tap();

    // Assert: back on seller dashboard
    await $(keys.seller.dashboardScreen).waitUntilVisible();
  });
}
