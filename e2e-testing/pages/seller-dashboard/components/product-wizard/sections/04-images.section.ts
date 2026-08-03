import { Locator, Page } from '@playwright/test';

export class ImagesSection {
  readonly page: Page;
  readonly urlTab: Locator;
  readonly urlInput: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.urlTab = page.getByTestId('wizard-image-url-tab');
    this.urlInput = page.getByTestId('wizard-image-url-input');
    this.nextButton = page.getByTestId('wizard-next-btn');
  }

  async addByUrl(url: string): Promise<void> {
    await this.urlTab.click();
    await this.urlInput.fill(url);
  }

  async continue(): Promise<void> {
    await this.nextButton.click();
  }
}
