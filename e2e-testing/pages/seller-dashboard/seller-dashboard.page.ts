import { Locator, Page } from '@playwright/test';

import { ProductWizardPage } from './components/product-wizard/product-wizard.page';

export class SellerDashboardPage {
  readonly page: Page;
  readonly addProductButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addProductButton = page.getByTestId('add-product-btn');
  }

  async openCreateProductWizard(): Promise<ProductWizardPage> {
    await this.addProductButton.click();
    return new ProductWizardPage(this.page);
  }

  getProductCard(name: string): Locator {
    return this.page
      .locator('[data-testid^="product-item-"]')
      .filter({ hasText: name });
  }
}
