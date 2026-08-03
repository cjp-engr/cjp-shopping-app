import { test as setup } from '@playwright/test';
import { authHeaders, SELLER_EMAIL, PASSWORD } from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const SELLER_STATE = '.auth/seller.json';

setup('authenticate as seller', async ({ page, request }) => {
  // Login via API to get token
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: { email: SELLER_EMAIL, password: PASSWORD },
  });
  const body = await loginRes.json();
  if (!body.token) throw new Error(`API login failed: ${JSON.stringify(body)}`);
  const { token, user } = body;

  // Promote to seller if not already
  await request.put(`${API_URL}/api/auth/profile`, {
    data: { role: 'seller' },
    headers: authHeaders(token),
  });

  // Inject token + user into localStorage before the page loads
  await page.addInitScript(
    ({ t, u }) => {
      localStorage.setItem('shopping_app_auth_token', t);
      localStorage.setItem('shopping_app_user_data', JSON.stringify(u));
    },
    { t: token, u: user },
  );

  await page.goto(`${WEB_URL}/`);
  // Wait for the app to read localStorage and show the authenticated navbar
  await page.getByTestId('user-menu-btn').waitFor({ timeout: 10_000 });

  await page.context().storageState({ path: SELLER_STATE });
});
