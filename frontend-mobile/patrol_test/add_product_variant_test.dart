// TC-091: Seller creates variant product via mobile 7-step wizard

import 'package:flutter/rendering.dart';
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import 'test_app.dart';
import 'test_credentials.dart';

void main() {
  testApp(
    'TC-091: seller creates variant product via wizard',
    tags: ['add-product-variant', 'seller', 'smoke'],
    ($, modules) async {
      await modules.auth.login(
        email: TestCredentials.sellerEmail,
        password: TestCredentials.password,
      );

      // Navigate to seller dashboard
      await $(keys.seller.sellerNavTab).tap();
      await $(keys.seller.dashboardScreen).waitUntilVisible();

      // Open add-product wizard
      await $(keys.seller.addProductFab).tap();

      // Step 0 — Basic Info
      await $(keys.seller.wizardProductNameField)
          .enterText('E2E Variant Shirt - Test');
      await $(keys.seller.wizardCategorySelector).tap();
      await $(keys.seller.categorySheetItem('Clothing')).tap();
      await $(keys.seller.wizardBrandField).enterText('Brand Test');
      await $(keys.seller.wizardNextButton).tap();

      // Step 1 — Pricing: enable variants
      await $(keys.seller.wizardVariantsToggle).tap();

      // Add "Size" attribute with values S, M, L
      await $(keys.seller.wizardAddAttributeButton).tap();
      await $(keys.seller.wizardAttrNameField).enterText('Size');
      await $(keys.seller.wizardAttrAddValueField).enterText('S');
      await $(keys.seller.wizardAttrAddValueButton).tap();
      await $(keys.seller.wizardAttrAddValueField).enterText('M');
      await $(keys.seller.wizardAttrAddValueButton).tap();
      await $(keys.seller.wizardAttrAddValueField).enterText('L');
      await $(keys.seller.wizardAttrAddValueButton).tap();
      await $(keys.seller.wizardAttrConfirmButton).tap();

      // Fill price and stock for each variant row (scroll each row into view first)
      await $(keys.seller.wizardVariantPriceField('S')).enterText('25.00');
      await $(keys.seller.wizardVariantStockField('S')).enterText('10');
      await $(keys.seller.wizardVariantDiscountField('S')).enterText('25.00');
      await $(keys.seller.wizardVariantSkuField('S')).enterText('SKU-S');

      await $(keys.seller.wizardVariantPriceField('M'))
          .scrollTo(scrollDirection: AxisDirection.down)
          .tap();
      await $(keys.seller.wizardVariantPriceField('M')).enterText('25.00');
      await $(keys.seller.wizardVariantStockField('M')).enterText('10');
      await $(keys.seller.wizardVariantDiscountField('M')).enterText('25.00');
      await $(keys.seller.wizardVariantSkuField('M')).enterText('SKU-M');

      await $(keys.seller.wizardVariantPriceField('L'))
          .scrollTo(scrollDirection: AxisDirection.down)
          .tap();
      await $(keys.seller.wizardVariantPriceField('L')).enterText('25.00');
      await $(keys.seller.wizardVariantStockField('L')).enterText('10');
      await $(keys.seller.wizardVariantDiscountField('L')).enterText('25.00');
      await $(keys.seller.wizardVariantSkuField('L')).enterText('SKU-L');

      await $(keys.seller.wizardNextButton).tap();

      // Step 2 — Description
      await $(keys.seller.wizardDescriptionField)
          .enterText('A test shirt with size variants.');
      await $(keys.seller.wizardTagsField).enterText('e2e');
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
    },
  );
}
