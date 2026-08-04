import * as fs from 'fs';
import * as path from 'path';
import { test as base } from '@playwright/test';

import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';
import { OrderDetailPage } from '../pages/order-detail.page';
import { ProductDetailPage } from '../pages/product-detail.page';
import { ProductListPage } from '../pages/product-list.page';
import { SellerDashboardPage } from '../pages/seller-dashboard/seller-dashboard.page';

const AUTH_DIR = path.join(__dirname, '..', '.auth');

type MyFixtures = {
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  homePage: HomePage;
  loginPage: LoginPage;
  orderDetailPage: OrderDetailPage;
  productDetailPage: ProductDetailPage;
  productListPage: ProductListPage;
  sellerDashboardPage: SellerDashboardPage;
  switchRole: (role: 'buyer' | 'seller') => Promise<void>;
};

export const test = base.extend<MyFixtures>({
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  orderDetailPage: async ({ page }, use) => {
    await use(new OrderDetailPage(page));
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  productListPage: async ({ page }, use) => {
    await use(new ProductListPage(page));
  },
  sellerDashboardPage: async ({ page }, use) => {
    await use(new SellerDashboardPage(page));
  },
  switchRole: async ({ page }, use) => {
    const switcher = async (role: 'buyer' | 'seller') => {
      const statePath = path.join(AUTH_DIR, `${role}.json`);
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      const entries: { name: string; value: string }[] =
        state.origins?.[0]?.localStorage ?? [];

      await page.evaluate((items) => {
        localStorage.clear();
        for (const { name, value } of items) {
          localStorage.setItem(name, value);
        }
      }, entries);

      await page.reload();
    };
    await use(switcher);
  },
});

export { expect } from '@playwright/test';
