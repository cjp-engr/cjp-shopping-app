import { Locator, Page } from '@playwright/test';

export class ProductDetailPage {
  readonly page: Page;
  readonly root: Locator;
  readonly addToCartButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('product-detail-page');
    this.addToCartButton = page.getByTestId('add-to-cart-btn');
  }

  /** Selects the first available value for every variant attribute group. */
  async selectFirstAvailableVariants(): Promise<void> {
    const variantGroups = this.page.locator('[data-testid^="variant-attr-"]');
    const count = await variantGroups.count();
    for (let i = 0; i < count; i++) {
      const firstEnabled = variantGroups.nth(i).locator('button:not([disabled])').first();
      if (await firstEnabled.count() > 0) {
        await firstEnabled.click();
      }
    }
  }

  async addToCart(): Promise<void> {
    await this.selectFirstAvailableVariants();
    await this.addToCartButton.waitFor();
    await this.addToCartButton.click();
  }
}
