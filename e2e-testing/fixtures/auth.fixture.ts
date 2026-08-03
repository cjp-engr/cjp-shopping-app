import { test as base } from '@playwright/test';
import { login } from '../helpers/api-client';

type AuthFixtures = {
  buyerToken: string;
};

export const test = base.extend<AuthFixtures>({
  buyerToken: async ({ request }, use) => {
    const token = await login(request);
    await use(token);
  },
});

export { expect } from '@playwright/test';
