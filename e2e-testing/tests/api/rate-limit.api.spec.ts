// TC coverage: TC-114 (auth route RateLimit headers), TC-115 (API route RateLimit headers),
//              TC-116 (RateLimit-Remaining decrements), TC-117 (auth 429 enforcement),
//              TC-118 (Retry-After header on 429), TC-119 (API route 429 enforcement)
//
// The limits are read from the BACKEND (the RateLimit-Limit header of a probe request), so nothing
// needs to be exported for the test runner:
//   - TC-114..116 run whenever the limiter is enabled (they skip when a limit is disabled with 0).
//   - TC-117..119 run only when the backend was started with small limits
//     (RATE_LIMIT_AUTH_MAX <= 5 and RATE_LIMIT_API_MAX <= 10, e.g. 3 and 5) and skip otherwise.
//
// The limits are per IP, so every request from this machine shares one bucket. The 429 tests exhaust it
// and every other spec would then fail with 429 for up to a minute. Run them on their own:
//   npx playwright test rate-limit.api.spec.ts --grep @low-limit
// against a backend started with the small limits.

import { test, expect, request as pwRequest, type APIResponse } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:5000';

const AUTH_LOW_LIMIT = 5;
const API_LOW_LIMIT = 10;

// One bucket per IP: the tests in this file must not interleave with each other.
test.describe.configure({ mode: 'serial' });

let authLimit = NaN;
let apiLimit = NaN;

const limitOf = (res: APIResponse): number => parseInt(res.headers()['ratelimit-limit'] ?? '', 10);
const remainingOf = (res: APIResponse): number => parseInt(res.headers()['ratelimit-remaining'] ?? '', 10);

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext({ baseURL: API_URL });
  authLimit = limitOf(await ctx.post('/api/auth/login', {
    data: { email: 'probe@test.com', password: 'wrong' },
  }));
  apiLimit = limitOf(await ctx.get('/api/products'));
  await ctx.dispose();
});

// ---------------------------------------------------------------------------
// Always-on: rate limit headers are present on every API response
// These pass regardless of the configured limit values and prove the
// middleware is wired up correctly.
// ---------------------------------------------------------------------------

test.describe('Rate limit — headers present on every response', () => {
  test.beforeAll(() => {
    test.skip(
      !Number.isFinite(authLimit) || !Number.isFinite(apiLimit),
      'Skipped: a rate limit is disabled on the backend (limit set to 0), so there are no RateLimit headers to assert',
    );
  });

  test(
    'TC-114: auth route includes RateLimit headers',
    { tag: ['@TC-114', '@api', '@rate-limit'] },
    async ({ request }) => {
      await test.step('Send POST /api/auth/login and assert RateLimit headers present', async () => {
        const res = await request.post('/api/auth/login', {
          data: { email: 'probe@test.com', password: 'wrong' },
        });

        expect(res.headers()).toHaveProperty('ratelimit-limit');
        expect(res.headers()).toHaveProperty('ratelimit-remaining');
        expect(res.headers()).toHaveProperty('ratelimit-reset');
      });
    },
  );

  test(
    'TC-115: product route includes RateLimit headers',
    { tag: ['@TC-115', '@api', '@rate-limit'] },
    async ({ request }) => {
      await test.step('Send GET /api/products and assert RateLimit headers present', async () => {
        const res = await request.get('/api/products');

        expect(res.headers()).toHaveProperty('ratelimit-limit');
        expect(res.headers()).toHaveProperty('ratelimit-remaining');
        expect(res.headers()).toHaveProperty('ratelimit-reset');
      });
    },
  );

  test(
    'TC-116: RateLimit-Remaining decrements across requests',
    { tag: ['@TC-116', '@api', '@rate-limit'] },
    async ({ request }) => {
      await test.step('Send two GET /api/products requests and assert remaining decrements', async () => {
        // The window is fixed (60 s). If it rolls over between the two calls the count jumps back up,
        // so retry a couple of times before calling it a failure.
        let decremented = false;
        for (let attempt = 0; attempt < 3 && !decremented; attempt++) {
          const first  = await request.get('/api/products');
          const second = await request.get('/api/products');
          decremented = remainingOf(second) < remainingOf(first);
        }
        expect(decremented).toBe(true);
      });
    },
  );
});

// ---------------------------------------------------------------------------
// 429 enforcement — only meaningful when the backend is started with small limits
// (RATE_LIMIT_AUTH_MAX=3 RATE_LIMIT_API_MAX=5). With the default limits (10 / 100) these tests
// skip automatically, based on the limit the backend reports.
// ---------------------------------------------------------------------------

test.describe('Rate limit — 429 enforcement (low-limit mode)', () => {
  test.beforeAll(() => {
    test.skip(
      !(authLimit <= AUTH_LOW_LIMIT),
      `Skipped: the backend auth limit is ${authLimit}; start it with RATE_LIMIT_AUTH_MAX=3 to run the 429 tests`,
    );
  });

  test(
    'TC-117: auth route returns 429 after limit is exhausted',
    { tag: ['@TC-117', '@api', '@rate-limit', '@low-limit'] },
    async ({ request }) => {
      await test.step('Exhaust auth rate limit', async () => {
        for (let i = 0; i < authLimit; i++) {
          await request.post('/api/auth/login', {
            data: { email: `probe${i}@test.com`, password: 'wrong' },
          });
        }
      });

      await test.step('Send one more login request and assert 429 with correct message', async () => {
        const res = await request.post('/api/auth/login', {
          data: { email: 'blocked@test.com', password: 'wrong' },
        });

        expect(res.status()).toBe(429);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe('Too many requests, please try again later.');
      });
    },
  );

  test(
    'TC-118: 429 response includes Retry-After header',
    { tag: ['@TC-118', '@api', '@rate-limit', '@low-limit'] },
    async ({ request }) => {
      await test.step('Exhaust auth rate limit', async () => {
        for (let i = 0; i < authLimit; i++) {
          await request.post('/api/auth/login', {
            data: { email: `probe${i}@test.com`, password: 'wrong' },
          });
        }
      });

      await test.step('Send one more login request and assert Retry-After header present', async () => {
        const res = await request.post('/api/auth/login', {
          data: { email: 'blocked@test.com', password: 'wrong' },
        });

        expect(res.status()).toBe(429);
        expect(res.headers()).toHaveProperty('retry-after');
      });
    },
  );
});

test.describe('Rate limit — 429 enforcement on API routes (low-limit mode)', () => {
  test.beforeAll(() => {
    test.skip(
      !(apiLimit <= API_LOW_LIMIT),
      `Skipped: the backend API limit is ${apiLimit}; start it with RATE_LIMIT_API_MAX=5 to run the 429 tests`,
    );
  });

  test(
    'TC-119: product route returns 429 after limit is exhausted',
    { tag: ['@TC-119', '@api', '@rate-limit', '@low-limit'] },
    async ({ request }) => {
      await test.step('Exhaust API rate limit with repeated GET /api/products', async () => {
        for (let i = 0; i < apiLimit; i++) {
          await request.get('/api/products');
        }
      });

      await test.step('Send one more request and assert 429 with correct message', async () => {
        const res = await request.get('/api/products');

        expect(res.status()).toBe(429);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe('Too many requests, please try again later.');
      });
    },
  );
});
