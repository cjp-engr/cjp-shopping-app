import { test as base } from '@playwright/test';

import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';
import { ProductDetailPage } from '../pages/product-detail.page';
import { ProductListPage } from '../pages/product-list.page';
import { SellerDashboardPage } from '../pages/seller-dashboard/seller-dashboard.page';

type MyFixtures = {
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  homePage: HomePage;
  loginPage: LoginPage;
  productDetailPage: ProductDetailPage;
  productListPage: ProductListPage;
  sellerDashboardPage: SellerDashboardPage;
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
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  productListPage: async ({ page }, use) => {
    await use(new ProductListPage(page));
  },
  sellerDashboardPage: async ({ page }, use) => {
    await use(new SellerDashboardPage(page));
  },
});

export { expect } from '@playwright/test';
