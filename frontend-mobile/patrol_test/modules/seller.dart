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

  Future<void> enableVariants() async {
    await $(keys.seller.wizardVariantsToggle).tap();
  }

  Future<void> addVariantAttribute({
    required String name,
    required List<String> values,
  }) async {
    await $(keys.seller.wizardAddAttributeButton).tap();
    await $(keys.seller.wizardAttrNameField).enterText(name);
    for (final value in values) {
      await $(keys.seller.wizardAttrAddValueField).enterText(value);
      await $(keys.seller.wizardAttrAddValueButton).tap();
    }
    await $(keys.seller.wizardAttrConfirmButton).tap();
  }

  Future<void> fillVariantRow(
    String label, {
    required String price,
    required String stock,
    String discount = '25.00',
    String sku = 'SKU',
  }) async {
    await $(keys.seller.wizardVariantPriceField(label))
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
    await $(keys.seller.wizardVariantPriceField(label)).enterText(price);
    await $(keys.seller.wizardVariantStockField(label)).enterText(stock);
    await $(keys.seller.wizardVariantDiscountField(label)).enterText(discount);
    await $(keys.seller.wizardVariantSkuField(label)).enterText('$sku-$label');
    await $(keys.seller.wizardNextButton).tap();
  }

  Future<void> fillVariantPricingStep({
    required List<String> sizes,
    required String price,
    required String stock,
    String discount = '25.00',
  }) async {
    await enableVariants();
    await addVariantAttribute(name: 'Size', values: sizes);
    for (final size in sizes) {
      await $(keys.seller.wizardVariantPriceField(size))
          .scrollTo(scrollDirection: AxisDirection.down)
          .tap();
      await $(keys.seller.wizardVariantPriceField(size)).enterText(price);
      await $(keys.seller.wizardVariantStockField(size)).enterText(stock);
      await $(keys.seller.wizardVariantDiscountField(size)).enterText(discount);
      await $(keys.seller.wizardVariantSkuField(size)).enterText('SKU-$size');
    }
    await $(keys.seller.wizardNextButton).tap();
  }

  Future<void> updateVariantPrice(String label, String price) async {
    await $(keys.seller.wizardVariantPriceField(label))
        .scrollTo(scrollDirection: AxisDirection.down)
        .tap();
    await $(keys.seller.wizardVariantPriceField(label)).enterText(price);
  }

  Future<void> advanceWizardStep() async {
    await $(keys.seller.wizardNextButton).tap();
  }

  Future<void> expectProductNameOnDashboard(String name) async {
    await $(name).waitUntilVisible();
  }

  Future<void> expectProductTileAbsent(String productId) async {
    await $(keys.seller.dashboardScreen).waitUntilVisible();
    if ($(keys.seller.productTile(productId)).exists) {
      throw StateError(
          'Product tile should not exist after deletion: $productId');
    }
  }

  Future<void> expectVariantOptionsVisible(List<String> sizes) async {
    for (final size in sizes) {
      await $(keys.products.variantValue('Size', size)).waitUntilVisible();
    }
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

  Future<void> addImageViaLink() async {
    await $(keys.seller.wizardAddImageTile).tap();
    await $(keys.seller.wizardImageLinkOption).tap();
    await $(keys.seller.wizardImageLinkField).enterText(
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400');
    await $(keys.seller.wizardImageLinkAddButton).tap();
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
