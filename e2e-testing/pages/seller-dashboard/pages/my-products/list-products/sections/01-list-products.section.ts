import { expect, Locator, Page } from '@playwright/test';

export class ListProductsSection {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  productCard(id: string): Locator {
    return this.page.getByTestId(`product-card-${id}`);
  }

  editButton(id: string): Locator {
    return this.page.getByTestId(`edit-product-${id}`);
  }

  deleteButton(id: string): Locator {
    return this.page.getByTestId(`delete-product-${id}`);
  }

  async expectProductVisible(id: string): Promise<void> {
    await expect(this.productCard(id)).toBeVisible();
  }

  async expectProductNotVisible(id: string): Promise<void> {
    await expect(this.productCard(id)).not.toBeVisible();
  }
}
