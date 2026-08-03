import { Locator, Page } from '@playwright/test';

export class ProductListPage {
  readonly page: Page;
  readonly root: Locator;
  readonly loadingSpinner: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('products-page');
    this.loadingSpinner = page.getByTestId('products-loading');
    this.searchInput = page.getByTestId('product-search-input');
  }

  async goto(): Promise<void> {
    await this.page.goto('/products');
    await this.root.waitFor();
    await this.loadingSpinner.waitFor({ state: 'hidden' });
  }

  async clickFirstProduct(): Promise<void> {
    await this.page.locator('[data-testid^="product-card-"]').first().click();
  }
}
