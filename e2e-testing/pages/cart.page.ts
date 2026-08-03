import { Locator, Page } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly root: Locator;
  readonly cartLink: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('cart-page');
    this.cartLink = page.getByTestId('cart-link');
    this.checkoutButton = page.getByTestId('checkout-btn');
  }

  async open(): Promise<void> {
    await this.cartLink.click();
    await this.root.waitFor();
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
