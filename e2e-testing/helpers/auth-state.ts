import * as fs from 'fs';
import * as path from 'path';

import type { APIRequestContext } from '@playwright/test';

import { authHeaders, PASSWORD, SELLER_EMAIL } from './api-client';

const AUTH_DIR = path.join(__dirname, '..', '.auth');

export function getBuyerToken(): string {
  const statePath = path.join(AUTH_DIR, 'buyer.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const entry = state.origins?.[0]?.localStorage?.find(
    (e: { name: string; value: string }) => e.name === 'shopping_app_auth_token',
  );
  if (!entry?.value) {
    throw new Error('Buyer auth token not found in .auth/buyer.json');
  }
  return entry.value;
}

export async function clearBuyerCart(
  request: APIRequestContext,
  apiUrl: string,
): Promise<void> {
  await request.delete(`${apiUrl}/api/cart`, {
    headers: authHeaders(getBuyerToken()),
  });
}

export async function loginSeller(
  request: APIRequestContext,
  apiUrl: string,
): Promise<string> {
  const response = await request.post(`${apiUrl}/api/auth/login`, {
    data: { email: SELLER_EMAIL, password: PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(`Seller login failed: ${response.status()} ${await response.text()}`);
  }
  const { token } = await response.json();
  return token as string;
}
