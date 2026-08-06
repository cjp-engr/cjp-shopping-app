import { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function injectAuth(
  page: Page,
  token: string,
  user: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('shopping_app_auth_token', token);
      localStorage.setItem('shopping_app_user_data', JSON.stringify(user));
      localStorage.removeItem('shopping_app_cart_data');
    },
    { token, user },
  );
  await page.reload();
  await expect(page.getByTestId('user-menu-btn')).toBeVisible({ timeout: 15_000 });
}
