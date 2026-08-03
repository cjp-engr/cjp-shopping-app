import { Locator, Page } from '@playwright/test';

export class BasicInfoSection {
  readonly page: Page;
  readonly productNameInput: Locator;
  readonly categorySelect: Locator;
  readonly brandInput: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productNameInput = page.getByTestId('wizard-name-input');
    this.categorySelect = page.getByTestId('wizard-category-select');
    this.brandInput = page.getByRole('textbox', { name: 'e.g. Sony, Apple, Samsung' });
    this.nextButton = page.getByTestId('wizard-next-btn');
  }

  async fill(name: string, category: string, brand?: string): Promise<void> {
    await this.productNameInput.fill(name);
    await this.categorySelect.selectOption(category);
    if (brand) {
      await this.brandInput.fill(brand);
    }
  }

  async continue(): Promise<void> {
    await this.nextButton.click();
  }
}
