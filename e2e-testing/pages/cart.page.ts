import { expect, Locator, Page } from '@playwright/test';

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
    // Register the GET wait before clicking so we catch the cart page's load request.
    const cartLoad = this.page.waitForResponse(
      res => res.url().includes('/api/cart') && res.request().method() === 'GET',
      { timeout: 10_000 },
    );
    await this.cartLink.click();
    await this.root.waitFor();
    await cartLoad;
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.waitFor();
    await this.checkoutButton.click();
  }

  cartItem(productId: string, variantId?: string): Locator {
    const suffix = variantId ? `-${variantId}` : '';
    return this.page.getByTestId(`cart-item-${productId}${suffix}`);
  }

  async expectVariantLineItem(
    productId: string,
    variantId: string,
    size: string,
    priceFragment: string,
  ): Promise<void> {
    const line = this.cartItem(productId, variantId);
    await expect(line).toBeVisible();
    await expect(line).toContainText(`Size: ${size}`);
    await expect(line).toContainText(priceFragment);
  }
}
