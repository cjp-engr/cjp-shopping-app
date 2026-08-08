import { Locator, Page } from '@playwright/test';

export class DeleteProductSection {
  readonly page: Page;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.confirmButton = page.getByRole('button', { name: 'Delete Product' });
  }

  async confirm(): Promise<void> {
    await this.confirmButton.waitFor({ state: 'visible', timeout: 5_000 });
    await this.confirmButton.click();
    await this.confirmButton.waitFor({ state: 'hidden', timeout: 10_000 });
  }
}
