# API Tests (Playwright)

HTTP-layer tests for the TokoMart backend API. These tests hit a real running backend at `:5000` — no mocks, no browser.

---

## Best Practices

### Structure

- **File named `*.api.spec.ts`.** The `.api.` segment distinguishes these from web E2E tests and maps to the `test:api` npm script.
- **TC-* ID in the file header.** First comment block must list every TC ID covered, with a short description of what each asserts:
  ```ts
  // TC coverage: TC-026 (order total formula), TC-027 (shipping $9.99 < $50),
  //              TC-028 (free shipping >= $50), TC-056 (insufficient stock → 400)
  ```
- **Use `request` fixture only — no `page`.** API tests are HTTP-only. If you find yourself importing `page`, move the test to `tests/web/`.
- **Group by domain in `test.describe`.** Each `describe` block maps to one or more `TC-*` IDs. Name it after the domain rule being tested, not the endpoint:
  ```ts
  test.describe('Orders API — shipping rules', () => { ... });
  ```
- **No `test.only()` or `test.skip()` in committed files.**

### Auth

Use helpers from `helpers/api-client.ts` — never hardcode credentials or tokens:

```ts
import { authHeaders, login, signupFreshUser, SELLER_EMAIL, TEST_PASSWORD } from '../../helpers/api-client';

// Seeded account (buyer or seller)
const token = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);

// Fresh account — guaranteed no prior state
const { token, userId } = await signupFreshUser(request, 'prefix');
```

Pass tokens via `authHeaders(token)`:

```ts
const res = await request.get('/api/orders', { headers: authHeaders(token) });
```

### Setup — `beforeAll` vs `beforeEach`

- **Use `beforeAll`** to create accounts, products, and other resources that are shared across tests in the file. Creating them once is faster and avoids seeding drift.
- **Use `beforeEach`** only for state that must be reset between tests (e.g. clearing a cart, cancelling an order).
- Declare token and ID variables at module scope; assign them inside `beforeAll`:

  ```ts
  let buyerToken: string;
  let productId: string;

  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext({ baseURL: API_URL });
    buyerToken = await login(ctx, SELLER_EMAIL, TEST_PASSWORD);
    // create test product...
    productId = (await res.json()).product._id;
  });
  ```

### Fresh vs Seeded Accounts

| When to use | Helper |
|---|---|
| Test needs a clean user with no history (no orders, no cart, not a seller) | `signupFreshUser(request, 'prefix')` |
| Test uses the seeded buyer/seller accounts and domain-known state | `login(ctx, SELLER_EMAIL, TEST_PASSWORD)` |

Never depend on shared seeded state changing between test runs — the seeded accounts accumulate orders and cart items across runs. If your test needs a known-clean state, use `signupFreshUser`.

### Assertions — assert all three layers

Every response must be checked for:

1. **Status code** — matches `api-reference.md` (200, 400, 403, 404, etc.)
2. **`body.success`** — `true` on success, `false` on error
3. **`body.message`** — exact error string from the backend source

```ts
expect(res.status()).toBe(400);
const body = await res.json();
expect(body.success).toBe(false);
expect(body.message).toBe('Cannot follow yourself');
```

Check `backend/NOTES.md` for the exact error string — never guess or paraphrase. A test that asserts `toBe('cannot follow yourself')` will always pass when the real message changes to something else.

### Domain Assertion Rules

| Rule | What to assert |
|---|---|
| Multi-seller order | `POST /api/orders` returns **one order per seller**, not one combined order |
| Order total | Use persisted `order.total` — not a manual sum of line prices |
| Shipping | $9.99 per seller when after-discount subtotal < $50; free otherwise |
| Tax | 8% of subtotal, calculated per seller |
| Stock deduction | After order is placed, check `GET /api/products/:id` stock is reduced |
| Stock restore | After cancel, check stock is restored to original value |
| Coupon scope | Coupon is applied per seller — assert `couponCodes[sellerId]` in the order payload, not a global discount |
| Buyer cancel guard | Only `pending` / `preparing` orders can be cancelled; `processing` → 400 |
| Review gate | `POST /api/reviews` before `delivered` status → 403 |
| Seller status skip | `pending` → `shipped` skipping `preparing`/`processing` → 400 invalid transition |

### Negative Test Cases

Negative tests verify that the API rejects invalid or unauthorized requests with the correct error. They are as important as happy-path tests — a missing negative test means a business rule is untested.

**Always assert all three layers on error responses:**

```ts
// Bad — status code alone does not prove the right rule fired
expect(res.status()).toBe(400);

// Good — all three layers confirm the exact rule
expect(res.status()).toBe(400);
const body = await res.json();
expect(body.success).toBe(false);
expect(body.message).toBe('Cannot follow yourself');   // exact string from backend/NOTES.md
```

**Set up the triggering condition explicitly.** Do not rely on the server being in the right state by accident. If the test needs an order in `processing` status to trigger the cancel guard, promote it there in `beforeAll`:

```ts
// Promote order to 'processing' so the cancel attempt fires the guard
await ctx.put(`/api/seller/orders/${orderId}/status`, {
  data: { status: 'processing' },
  headers: authHeaders(sellerToken),
});
// Now assert the buyer cancel is rejected
const res = await ctx.put(`/api/orders/${orderId}/status`, {
  data: { status: 'cancelled' },
  headers: authHeaders(buyerToken),
});
expect(res.status()).toBe(400);
```

**One rule per test.** Each negative test should cover exactly one boundary or rejection rule. Combining multiple rules in a single test makes it harder to know which one failed when the test breaks.

**Pair negative tests with their positive counterpart.** If TC-027 asserts shipping is charged when subtotal < $50, TC-028 should assert it is free when subtotal ≥ $50. Both must be in the same file, under the same `describe` block.

**Use `signupFreshUser` for permission tests.** When testing that a buyer is blocked from a seller route, use a freshly registered account — not the seeded buyer. A seeded account may have been promoted to seller in a prior run, making the test pass for the wrong reason:

```ts
// Fresh account guarantees non-seller status
const { token } = await signupFreshUser(request, 'buyer-access');
const res = await request.get('/api/seller/products', { headers: authHeaders(token) });
expect(res.status()).toBe(403);
```

**Name the test after the rule it enforces, not the HTTP method:**

```ts
// Bad
test('POST /api/users/:id/follow returns 400', async () => { ... });

// Good
test('TC-113: user cannot follow themselves', async () => { ... });
```

**Common negative test patterns in this project:**

| Rule type | Status | What to check |
|---|---|---|
| Auth missing / invalid token | 401 | `body.success: false`, `body.message` from `backend/NOTES.md` |
| Buyer accessing seller-only route | 403 | Same three-layer check |
| Cross-seller resource access | 403 | Use a second seller account, not the owner |
| Invalid business rule (self-follow, cancel guard, review gate) | 400 | Exact `body.message` string |
| Invalid status transition | 400 | Current status + target status both matter — document both in the test name |
| Insufficient stock | 400 | Place order for quantity > stock; assert stock is unchanged after rejection |
| Coupon below minimum | 400 | Assert `body.message` matches the minimum-order error string exactly |

### Anti-Patterns

| Anti-pattern | Fix |
|---|---|
| Asserting only the status code | Always assert `body.success` and `body.message` as well |
| Using `page` fixture in an API test | Remove it — API tests use `request` only |
| Hardcoded `Authorization: Bearer abc123` | Use `authHeaders(token)` |
| Seeded account assumed to have an empty cart | Use `signupFreshUser` or clear cart in `beforeEach` |
| Guessing the error message string | Read `backend/NOTES.md` for the exact string |
| Testing business logic only at E2E web layer | If strategy assigns the rule to API layer, the API test is the source of truth |

---

## Test Coverage

| File | TC IDs | What it tests |
|------|--------|---------------|
| `auth.api.spec.ts` | — | Login, `GET /me`, invalid credentials |
| `health.api.spec.ts` | — | API server health smoke |
| `orders.api.spec.ts` | TC-025, TC-026, TC-027, TC-028, TC-033, TC-056 | Order totals, shipping rules, multi-seller split, cancel guard, stock validation |
| `seller-access.api.spec.ts` | TC-048, TC-053, TC-054 | Buyer blocked from seller routes, cross-seller edit/delete blocked, invalid status transition |
| `reviews.api.spec.ts` | TC-035, TC-036 | Duplicate review blocked, review before delivery blocked |
| `coupons.api.spec.ts` | TC-057 | Coupon below minimum order amount |
| `cart.api.spec.ts` | TC-107, TC-108 | Cart returns buyer's own items, cart isolation between buyers |
| `order-isolation.api.spec.ts` | TC-110, TC-111 | Order list isolation, order detail ownership (403) |
| `users.api.spec.ts` | TC-113 | User cannot follow themselves |
| `rate-limit.api.spec.ts` | TC-114, TC-115, TC-116, TC-117, TC-118, TC-119 | Rate limit headers present; 429 enforcement (low-limit mode) |
