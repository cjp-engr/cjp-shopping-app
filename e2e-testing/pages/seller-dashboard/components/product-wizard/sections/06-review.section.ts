import { Locator, Page } from '@playwright/test';

export class ReviewSection {
  readonly page: Page;
  readonly publishButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.publishButton = page.getByTestId('wizard-publish-btn');
  }

  async publish(): Promise<void> {
    await this.publishButton.click();
  }
}
