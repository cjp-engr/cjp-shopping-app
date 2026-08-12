import 'package:flutter/rendering.dart';
import 'package:patrol/patrol.dart';
import 'package:toko_mart/keys.dart';

import 'module.dart';

final class Seller extends Module {
  Seller(super.$);

  Future<void> navigateToDashboard() async {
    await $(keys.seller.sellerNavTab).tap();
    await $(keys.seller.dashboardScreen).waitUntilVisible();
  }

  Future<void> openWizard() async {
    await $(keys.seller.addProductFab).tap();
  }

  Future<void> fillBasicInfo({
    required String name,
    required String category,
    String brand = 'Brand Test',
  }) async {
    await $(keys.seller.wizardProductNameField).enterText(name);
    await $(keys.seller.wizardCategorySelector).tap();
    await $(keys.seller.categorySheetItem(category)).tap();
    await $(keys.seller.wizardBrandField).enterText(brand);
    await $(keys.seller.wizardNextButton).tap();
  }

  Future<void> fillPricing({
    required String price,
    required String stock,
    String sku = 'E2E-SKU',
    String discount = '10',
  }) async {
    await $(keys.seller.wizardPriceField).enterText(price);
    await $(keys.seller.wizardStockField).enterText(stock);
    await $(keys.seller.wizardSkuField).enterText(sku);
    await $(keys.seller.wizardDiscountField).enterText(discount);
    await $(keys.seller.wizardNextButton).tap();
  }

  Future<void> fillDescription({
    required String description,
    String tag = 'e2e',
  }) async {
    await $(keys.seller.wizardDescriptionField).enterText(description);
    await $(keys.seller.wizardTagsField).enterText(tag);
    await $(keys.seller.wizardAddTagButton).tap();
    await $(keys.seller.wizardNextButton).tap();
  }

  Future<void> addImageViaCamera() async {
    await $(keys.seller.wizardAddImageTile).tap();
    await $(keys.seller.wizardCameraOption).tap();
    await $(keys.widgets.dialogConfirmButton).tap();
    await $.platform.mobile.grantPermissionWhenInUse();
    await $.platform.mobile
        .tap(Selector(resourceId: 'com.android.camera2:id/shutter_button'));
    await $.platform.mobile
        .tap(Selector(resourceId: 'com.android.camera2:id/done_button'));
    await $(keys.seller.wizardNextButton).tap();
  }

  /// Skips the Images step without adding a photo (valid for edit flow or
  /// tests that don't need an image — product has no images pre-condition).
  Future<void> skipImages() async {
    await $(keys.seller.wizardNextButton).tap();
  }

  Future<void> fillShipping() async {
    await $(keys.seller.wizardExpressButton).tap();
    await $(keys.seller.wizardPickupButton).tap();
    await $(keys.seller.wizardBuyerPaysButton).tap();
    await $(keys.seller.wizardShippingFeeField('standard')).enterText('10');
    await $(keys.seller.wizardShippingFeeField('express')).enterText('15');
    await $(keys.seller.wizardShippingFeeField('pickup')).enterText('5');
    await $(keys.seller.wizardNextButton).tap();
  }

  Future<void> publish() async {
    await $(keys.seller.wizardPublishButton).tap();
    await $(keys.seller.dashboardScreen).waitUntilVisible();
  }

  Future<void> tapProductTile(String productId) async {
    await $(keys.seller.productTile(productId))
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
  }

  Future<void> tapEditProduct(String productId) async {
    await $(keys.seller.editProductButton(productId))
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
  }

  Future<void> tapDeleteProduct(String productId) async {
    await $(keys.seller.deleteProductButton(productId))
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
  }

  Future<void> confirmDelete() async {
    await $(keys.widgets.dialogConfirmButton).waitUntilVisible();
    await $(keys.widgets.dialogConfirmButton).tap();
  }
}
