import 'package:flutter/widgets.dart';

class _SellerKey extends ValueKey<String> {
  const _SellerKey(String value) : super('seller_$value');
}

class SellerKeys {
  final addProductFab = const _SellerKey('addProductFab');
  // ignore: library_private_types_in_public_api
  _SellerKey categorySheetItem(String category) =>
      _SellerKey('categorySheetItem_$category');
  final dashboardScreen = const _SellerKey('dashboardScreen');
  final sellerNavTab = const _SellerKey('sellerNavTab');

  final wizardNextButton = const _SellerKey('wizardNextButton');

  // Basic Info
  final wizardProductNameField = const _SellerKey('wizardProductNameField');
  final wizardCategorySelector = const _SellerKey('wizardCategorySelector');
  final wizardBrandField = const _SellerKey('wizardBrandField');
  final wizardBrandNewButton = const _SellerKey('wizardBrandNewButton');
  final wizardUsedButton = const _SellerKey('wizardUsedButton');

  // Pricing
  final wizardPriceField = const _SellerKey('wizardPriceField');
  final wizardStockField = const _SellerKey('wizardStockField');
  final wizardSkuField = const _SellerKey('wizardSkuField');
  final wizardDiscountField = const _SellerKey('wizardDiscountField');

  // Description
  final wizardDescriptionField = const _SellerKey('wizardDescriptionField');
  final wizardTagsField = const _SellerKey('wizardTagsField');
  final wizardAddTagButton = const _SellerKey('wizardAddTagButton');

  // Images
  final wizardAddImageTile = const _SellerKey('wizardAddImageTile');
  final wizardCameraOption = const _SellerKey('wizardCameraOption');
  final wizardImageLinkOption = const _SellerKey('wizardImageLinkOption');
  final wizardGalleryOption = const _SellerKey('wizardGalleryOption');

  // Variants (Step 1)
  final wizardAddAttributeButton = const _SellerKey('wizardAddAttributeButton');
  final wizardAttrAddValueButton = const _SellerKey('wizardAttrAddValueButton');
  final wizardAttrAddValueField = const _SellerKey('wizardAttrAddValueField');
  final wizardAttrConfirmButton = const _SellerKey('wizardAttrConfirmButton');
  final wizardAttrNameField = const _SellerKey('wizardAttrNameField');
  final wizardVariantsToggle = const _SellerKey('wizardVariantsToggle');

  // ignore: library_private_types_in_public_api
  _SellerKey wizardVariantDiscountField(String label) =>
      _SellerKey('wizardVariantDiscount_$label');
  // ignore: library_private_types_in_public_api
  _SellerKey wizardVariantPriceField(String label) =>
      _SellerKey('wizardVariantPrice_$label');
  // ignore: library_private_types_in_public_api
  _SellerKey wizardVariantSkuField(String label) =>
      _SellerKey('wizardVariantSku_$label');
  // ignore: library_private_types_in_public_api
  _SellerKey wizardVariantStockField(String label) =>
      _SellerKey('wizardVariantStock_$label');

  // Shipping
  final wizardStandardButton = const _SellerKey('wizardStandardButton');
  final wizardExpressButton = const _SellerKey('wizardExpressButton');
  final wizardPickupButton = const _SellerKey('wizardPickupButton');

  final wizardFreeShippingButton = const _SellerKey('wizardFreeShippingButton');
  final wizardBuyerPaysButton = const _SellerKey('wizardBuyerPaysButton');

  // ignore: library_private_types_in_public_api
  _SellerKey wizardShippingFeeField(String option) =>
      _SellerKey('wizardShippingFee_$option');

  final wizardPublishButton = const _SellerKey('wizardPublishButton');

  // Product tile actions (parameterized by product id)
  // ignore: library_private_types_in_public_api
  _SellerKey productTile(String id) => _SellerKey('productTile_$id');
  // ignore: library_private_types_in_public_api
  _SellerKey editProductButton(String id) => _SellerKey('editProductButton_$id');
  // ignore: library_private_types_in_public_api
  _SellerKey deleteProductButton(String id) => _SellerKey('deleteProductButton_$id');
}
