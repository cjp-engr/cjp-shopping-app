import { Locator, Page } from '@playwright/test';

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface NewCardData {
  type?: string; // 'credit-card' | 'debit-card' | 'paypal' — defaults to 'credit-card'
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string; // zero-padded e.g. '12'
  expiryYear: string;  // four-digit e.g. '2028'
  cvv: string;
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

  /** Use when buyer has saved cards and should pay with the default/first saved card. */
  async selectSavedCard(): Promise<void> {
    // Button accessible name is "Saved Card Use a saved card" (two text nodes) — use substring match
    const savedCardBtn = this.page.getByRole('button', { name: /saved card/i });
    if (await savedCardBtn.isVisible()) {
      await savedCardBtn.click();
    }
    // First saved card is auto-selected by the UI — no further action needed
  }

  /** Use when buyer should pay with COD or enter a new card. */
  async selectPaymentMethod(method: string): Promise<void> {
    // Button accessible name is "New Card Enter a different card" — use substring match
    const newCardBtn = this.page.getByRole('button', { name: /new card/i });
    if (await newCardBtn.isVisible()) {
      await newCardBtn.click();
    }
    await this.page.locator('select[name="type"]').selectOption(method);
  }

  /** Use when buyer should pay with a new card and fill all card fields. */
  async fillNewCardForm(data: NewCardData): Promise<void> {
    // Button accessible name is "New Card Enter a different card" — use substring match
    const newCardBtn = this.page.getByRole('button', { name: /new card/i });
    if (await newCardBtn.isVisible()) {
      await newCardBtn.click();
    }
    await this.page.locator('select[name="type"]').selectOption(data.type ?? 'credit-card');
    await this.page.getByLabel(/card number/i).fill(data.cardNumber);
    await this.page.getByLabel(/cardholder name/i).fill(data.cardHolder);
    await this.page.locator('select[name="expiryMonth"]').selectOption(data.expiryMonth);
    await this.page.locator('select[name="expiryYear"]').selectOption(data.expiryYear);
    await this.page.getByLabel(/cvv/i).fill(data.cvv);
  }

  async continueToReview(): Promise<void> {
    await this.page.getByRole('button', { name: /review order/i }).click();
    await this.placeOrderButton.waitFor();
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }
}
