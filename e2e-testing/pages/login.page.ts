import { Locator, Page } from '@playwright/test';

import {
  BUYER_EMAIL,
  SELLER_EMAIL,
  TEST_PASSWORD,
} from '../helpers/api-client';

export class LoginPage {
  readonly page: Page;
  readonly loginForm: Locator;
  readonly emailField: Locator;
  readonly passwordField: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginForm = page.getByTestId('login-form');
    this.emailField = page.getByLabel(/email/i);
    this.passwordField = page.locator('input[name="password"]');
    this.submitButton = page.getByTestId('login-submit-btn');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await this.loginForm.waitFor();
  }

  async loginAs(email: string, password: string): Promise<void> {
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.submitButton.click();
  }

  async loginAsBuyer(): Promise<void> {
    await this.loginAs(BUYER_EMAIL, TEST_PASSWORD);
  }

  async loginAsSeller(): Promise<void> {
    await this.loginAs(SELLER_EMAIL, TEST_PASSWORD);
  }
}
