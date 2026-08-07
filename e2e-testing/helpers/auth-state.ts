import * as fs from 'fs';
import * as path from 'path';

import type { APIRequestContext } from '@playwright/test';

import { authHeaders, PASSWORD, SELLER_EMAIL } from './api-client';

const AUTH_DIR = path.join(__dirname, '..', '.auth');

function readTokenFromAuthFile(role: 'buyer' | 'seller'): string {
  const statePath = path.join(AUTH_DIR, `${role}.json`);
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const entry = state.origins?.[0]?.localStorage?.find(
    (e: { name: string; value: string }) => e.name === 'shopping_app_auth_token',
  );
  if (!entry?.value) {
    throw new Error(`${role} auth token not found in .auth/${role}.json`);
  }
  return entry.value;
}

export function getBuyerToken(): string {
  return readTokenFromAuthFile('buyer');
}

export function getSellerToken(): string {
  return readTokenFromAuthFile('seller');
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
