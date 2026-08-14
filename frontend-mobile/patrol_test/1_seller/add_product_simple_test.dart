// TC-090: Seller creates simple product via 7-step wizard on mobile

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('TC-090: seller creates simple product via wizard',
      tags: ['add-product-simple', 'seller', 'smoke'], ($, modules) async {
    await modules.auth.login(
      email: TestCredentials.sellerEmail,
      password: TestCredentials.password,
    );

    await modules.seller.navigateToDashboard();
    await modules.seller.openWizard();

    await modules.seller.fillBasicInfo(
      name: 'E2E Test Lamp - Test',
      category: 'Home & Garden',
    );

    await modules.seller.fillPricing(
      price: '29.99',
      stock: '10',
      sku: 'E2E-Lamp-SKU',
      discount: '10',
    );

    await modules.seller.fillDescription(
      description: 'A beautiful test lamp for home decor.',
    );

    await modules.seller.addImageViaCamera();
    await modules.seller.fillShipping();
    await modules.seller.publish();
  });
}
