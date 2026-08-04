import { expect, Locator, Page } from '@playwright/test';

import { ProductWizardPage } from './components/product-wizard/product-wizard.page';

export class SellerDashboardPage {
  readonly page: Page;
  readonly root: Locator;
  readonly addProductButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('seller-dashboard');
    this.addProductButton = page.getByTestId('add-product-btn');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.root).toBeVisible({ timeout: 10_000 });
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

  async getProductIdFromCard(name: string): Promise<string> {
    const card = this.getProductCard(name);
    await expect(card).toBeVisible();
    const testId = await card.getAttribute('data-testid');
    const productId = testId?.replace('product-item-', '');
    if (!productId) {
      throw new Error(`Could not resolve product id from card: ${name}`);
    }
    return productId;
  }
}
