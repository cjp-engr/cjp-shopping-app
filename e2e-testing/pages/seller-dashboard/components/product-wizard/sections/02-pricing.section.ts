import { Locator, Page } from '@playwright/test';

export class PricingSection {
  readonly page: Page;
  readonly priceInput: Locator;
  readonly stockInput: Locator;
  readonly skuInput: Locator;
  readonly discountInput: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.priceInput = page.getByTestId('wizard-price-input');
    this.stockInput = page.getByTestId('wizard-stock-input');
    this.skuInput = page.getByRole('textbox', { name: 'e.g. SKU-001' });
    this.discountInput = page.getByRole('spinbutton', { name: 'e.g. 10' });
    this.nextButton = page.getByTestId('wizard-next-btn');
  }

  async fill(
    price: string,
    stock: string,
    sku?: string,
    discount?: string,
  ): Promise<void> {
    await this.priceInput.fill(price);
    await this.stockInput.fill(stock);
    if (sku) {
      await this.skuInput.fill(sku);
    }
    if (discount) {
      await this.discountInput.fill(discount);
    }
  }

  async continue(): Promise<void> {
    await this.nextButton.click();
  }
}
