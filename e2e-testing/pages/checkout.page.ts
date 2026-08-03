import { Locator, Page } from '@playwright/test';

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export class CheckoutPage {
  readonly page: Page;
  readonly root: Locator;
  readonly shippingSection: Locator;
  readonly paymentSection: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('checkout-page');
    this.shippingSection = page.getByTestId('shipping-section');
    this.paymentSection = page.getByTestId('payment-section');
    this.placeOrderButton = page.getByTestId('place-order-btn');
  }

  async fillNewShippingAddress(address: ShippingAddress): Promise<void> {
    await this.page.getByRole('button', { name: /new address/i }).click();
    await this.page.getByLabel(/street address/i).fill(address.street);
    await this.page.getByLabel(/city/i).fill(address.city);
    await this.page.getByLabel(/state/i).fill(address.state);
    await this.page.getByLabel(/zip/i).fill(address.zip);
    await this.page.getByLabel(/phone/i).fill(address.phone);
  }

  async continueToPayment(): Promise<void> {
    await this.page.getByRole('button', { name: /continue to payment/i }).click();
    await this.paymentSection.waitFor();
  }

  async selectPaymentMethod(method: string): Promise<void> {
    // Switch to new card form if saved cards are shown (dropdown is hidden in saved-card mode)
    const newCardBtn = this.page.getByRole('button', { name: /new card/i });
    if (await newCardBtn.isVisible()) {
      await newCardBtn.click();
    }
    await this.page.locator('select[name="type"]').selectOption(method);
  }

  async continueToReview(): Promise<void> {
    await this.page.getByRole('button', { name: /review order/i }).click();
    await this.placeOrderButton.waitFor();
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }
}
