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
  final wizardAddImageTile = const _SellerKey('wizardAddImageTile');
  final wizardCameraOption = const _SellerKey('wizardCameraOption');
  final wizardCategorySelector = const _SellerKey('wizardCategorySelector');
  final wizardGalleryOption = const _SellerKey('wizardGalleryOption');
  final wizardDescriptionField = const _SellerKey('wizardDescriptionField');
  final wizardNextButton = const _SellerKey('wizardNextButton');
  final wizardPriceField = const _SellerKey('wizardPriceField');
  final wizardProductNameField = const _SellerKey('wizardProductNameField');
  final wizardPublishButton = const _SellerKey('wizardPublishButton');
  final wizardStockField = const _SellerKey('wizardStockField');
}
