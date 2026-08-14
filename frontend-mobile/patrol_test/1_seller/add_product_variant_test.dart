// TC-091: Seller creates variant product via mobile 7-step wizard

import '../modules/api_clients.dart';
import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp(
    'TC-091: seller creates variant product via wizard',
    tags: ['add-product-variant', 'seller', 'smoke'],
    ($, modules) async {
      final productName =
          'E2E Variant Shirt - ${DateTime.now().millisecondsSinceEpoch}';

      await modules.auth.login(
        email: TestCredentials.sellerEmail,
        password: TestCredentials.password,
      );

      await modules.seller.navigateToDashboard();
      await modules.seller.openWizard();

      await modules.seller.fillBasicInfo(
        name: productName,
        category: 'Clothing',
      );

      await modules.seller.fillVariantPricingStep(
        sizes: ['S', 'M', 'L'],
        price: '25.00',
        stock: '10',
      );

      await modules.seller.fillDescription(
        description: 'A test shirt with size variants.',
      );

      await modules.seller.addImageViaCamera();
      await modules.seller.fillShipping();
      await modules.seller.publish();

      await modules.seller.expectProductNameOnDashboard(productName);

      // Teardown — delete via API
      final api = SellerApiClient();
      await api.login(TestCredentials.sellerEmail, TestCredentials.password);
      final productId = await api.findProductByName(productName);
      await api.deleteProduct(productId);
    },
  );
}
