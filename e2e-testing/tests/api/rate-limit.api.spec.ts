// TC coverage: TC-114 (auth route RateLimit headers), TC-115 (API route RateLimit headers),
//              TC-116 (RateLimit-Remaining decrements), TC-117 (auth 429 enforcement),
//              TC-118 (Retry-After header on 429), TC-119 (API route 429 enforcement)
//
// TC-117, TC-118, TC-119 require backend started with RATE_LIMIT_AUTH_MAX=3 RATE_LIMIT_API_MAX=5
// — these tests auto-skip when default limits are in effect.

import { test, expect, type APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Always-on: rate limit headers are present on every API response
// These pass regardless of the configured limit values and prove the
// middleware is wired up correctly.
// ---------------------------------------------------------------------------

test.describe('Rate limit — headers present on every response', () => {
  test('TC-114: auth route includes RateLimit headers', async ({ request }) => {
    await test.step('Send POST /api/auth/login and assert RateLimit headers present', async () => {
      const res = await request.post('/api/auth/login', {
        data: { email: 'probe@test.com', password: 'wrong' },
      });

      expect(res.headers()).toHaveProperty('ratelimit-limit');
      expect(res.headers()).toHaveProperty('ratelimit-remaining');
      expect(res.headers()).toHaveProperty('ratelimit-reset');
    });
  });

  test('TC-115: product route includes RateLimit headers', async ({ request }) => {
    await test.step('Send GET /api/products and assert RateLimit headers present', async () => {
      const res = await request.get('/api/products');

      expect(res.headers()).toHaveProperty('ratelimit-limit');
      expect(res.headers()).toHaveProperty('ratelimit-remaining');
      expect(res.headers()).toHaveProperty('ratelimit-reset');
    });
  });

  test('TC-116: RateLimit-Remaining decrements across requests', async ({ request }) => {
    await test.step('Send two GET /api/products requests and assert remaining decrements', async () => {
      const first  = await request.get('/api/products');
      const second = await request.get('/api/products');

      const remainingAfterFirst  = parseInt(first.headers()['ratelimit-remaining']);
      const remainingAfterSecond = parseInt(second.headers()['ratelimit-remaining']);

      expect(remainingAfterSecond).toBeLessThan(remainingAfterFirst);
    });
  });
});

// ---------------------------------------------------------------------------
// 429 enforcement — only meaningful when backend is started with small limits.
// Set RATE_LIMIT_AUTH_MAX=3 RATE_LIMIT_API_MAX=5 on the backend process,
// then run: npx playwright test rate-limit.api.spec.ts
//
// With default limits (10 / 100) these tests are skipped automatically.
// ---------------------------------------------------------------------------

const authMax = parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10');
const apiMax  = parseInt(process.env.RATE_LIMIT_API_MAX  ?? '100');

async function exhaustAuthLimit(request: APIRequestContext, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await request.post('/api/auth/login', {
      data: { email: `probe${i}@test.com`, password: 'wrong' },
    });
  }
}

test.describe('Rate limit — 429 enforcement (low-limit mode)', () => {
  test.skip(
    authMax > 5,
    'Skipped: set RATE_LIMIT_AUTH_MAX=3 on the backend to run 429 enforcement tests',
  );

  test('TC-117: auth route returns 429 after limit is exhausted', async ({ request }) => {
    await test.step('Exhaust auth rate limit', async () => {
      await exhaustAuthLimit(request, authMax);
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
  });

  test('TC-118: 429 response includes Retry-After header', async ({ request }) => {
    await test.step('Exhaust auth rate limit', async () => {
      await exhaustAuthLimit(request, authMax);
    });

    await test.step('Send one more login request and assert Retry-After header present', async () => {
      const res = await request.post('/api/auth/login', {
        data: { email: 'blocked@test.com', password: 'wrong' },
      });

      expect(res.status()).toBe(429);
      expect(res.headers()).toHaveProperty('retry-after');
    });
  });
});

test.describe('Rate limit — 429 enforcement on API routes (low-limit mode)', () => {
  test.skip(
    apiMax > 10,
    'Skipped: set RATE_LIMIT_API_MAX=5 on the backend to run 429 enforcement tests',
  );

  test('TC-119: product route returns 429 after limit is exhausted', async ({ request }) => {
    await test.step('Exhaust API rate limit with repeated GET /api/products', async () => {
      for (let i = 0; i < apiMax; i++) {
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
  });
});
