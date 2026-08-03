import { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly userMenuButton: Locator;
  readonly sellerDashboardLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userMenuButton = page.getByTestId('user-menu-btn');
    this.sellerDashboardLink = page.getByTestId('nav-seller-link');
  }

  async navigateToSellerDashboard(): Promise<void> {
    await this.userMenuButton.click();
    await this.sellerDashboardLink.click();
  }
}
