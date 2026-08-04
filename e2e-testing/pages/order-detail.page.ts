import { expect, Locator, Page } from '@playwright/test';

export class OrderDetailPage {
  readonly page: Page;
  readonly root: Locator;
  readonly statusBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId('order-detail-page');
    this.statusBadge = page.getByTestId('order-status-badge');
  }

  async goto(orderId: string): Promise<void> {
    await this.page.goto(`/orders/${orderId}`);
    await this.root.waitFor();
  }

  orderItem(productId: string): Locator {
    return this.page.getByTestId(`order-item-${productId}`);
  }

  async expectVariantLine(
    productId: string,
    size: string,
    unitPrice: string,
  ): Promise<void> {
    const item = this.orderItem(productId);
    await expect(item).toBeVisible();
    await expect(item).toContainText(`Size: ${size}`);
    await expect(item).toContainText(`${unitPrice} each`);
  }
}
