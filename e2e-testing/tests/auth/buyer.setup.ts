import { test as setup } from '@playwright/test';
import { BUYER_EMAIL, PASSWORD } from '../../helpers/api-client';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';
const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const BUYER_STATE = '.auth/buyer.json';

setup('authenticate as buyer', async ({ page, request }) => {
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: { email: BUYER_EMAIL, password: PASSWORD },
  });
  const body = await loginRes.json();
  if (!body.token) throw new Error(`Buyer login failed: ${JSON.stringify(body)}`);
  const { token, user } = body;

  await page.addInitScript(
    ({ t, u }) => {
      localStorage.setItem('shopping_app_auth_token', t);
      localStorage.setItem('shopping_app_user_data', JSON.stringify(u));
    },
    { t: token, u: user },
  );

  await page.goto(`${WEB_URL}/`);
  await page.getByTestId('user-menu-btn').waitFor({ timeout: 10_000 });

  await page.context().storageState({ path: BUYER_STATE });
});
