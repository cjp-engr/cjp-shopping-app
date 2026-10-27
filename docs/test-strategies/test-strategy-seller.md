# TokoMart Test Strategy — Seller (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Role filter:** Seller | Both  
**Platform:** Web + Mobile

---

## Pyramid (Seller, 103 scenarios; 63 added 2026-10-24 to 2026-10-27)

Role = Seller or Both across web, mobile and API. Counts are recomputed from the master; the old per-platform split is replaced by one table.

| Layer | Count | Of which added 2026-10-24 |
|-------|-------|---------------------------|
| E2E (Playwright + Patrol) | 33 | 0 |
| Multi (≥ 2 layers) | 16 | 15 |
| API | 38 | 34 |
| Component / widget | 5 | 5 |
| Integration | 4 | 4 |
| Unit | 3 | 3 |
| Manual | 4 | 2 |

---

## P0 seller — build first

| ID | Layer | Tool | Target file |
|----|-------|------|-------------|
| TC-041 | E2E | Playwright | `seller/onboarding.spec.ts` |
| TC-042 | E2E | Playwright | `seller/product-wizard.spec.ts` |
| TC-064 | E2E | Playwright | `seller/product-wizard.spec.ts` |
| TC-047 | E2E | Playwright | `seller/orders.spec.ts` |
| TC-048 | API | Playwright-API | `seller/orders.api.spec.ts` |
| TC-054 | API | Playwright-API | `products.api.spec.ts` |

### P0 seller — Mobile (Patrol)

| ID | Layer | Tool | Target file | Phase |
|----|-------|------|-------------|-------|
| TC-089 | E2E | Patrol | `seller/onboarding_test.dart` | M3 |
| TC-090 | E2E | Patrol | `seller/product_wizard_test.dart` | M3 |
| TC-091 | E2E | Patrol | `seller/product_wizard_test.dart` | M3 |
| TC-092 | E2E | Patrol | `seller/orders_test.dart` | M3 |
| TC-610 | E2E | Patrol | `catalog_test.dart` | M4 |

---

## Product listing strategy

| ID | Title | Layer | Phase |
|----|-------|-------|-------|
| TC-042 | Simple product listing (6-step wizard) | E2E | 2 |
| TC-064 | Variant product listing | E2E | 2 |
| TC-043 | Wizard validation | E2E | 5 |
| TC-044 | Edit price/stock | E2E | 5 |
| TC-045 | My Products preview | E2E | 5 |
| TC-046 | Delete product | E2E | 5 |
| TC-058 | Description max 200 | API | 3 |
| TC-015 | Own products hidden (seller view) | E2E | 4 |

### Mobile product listing strategy

| ID | Title | Layer | Phase |
|----|-------|-------|-------|
| TC-090 | Simple product (7-step wizard) | E2E Patrol | M3 |
| TC-091 | Variant product (7-step wizard) | E2E Patrol | M3 |
| TC-615 | View simple product in dashboard (Read) | E2E Patrol | M4 |
| TC-616 | Edit simple product from dashboard (Update) | E2E Patrol | M4 |
| TC-617 | Delete simple product from dashboard (Delete) | E2E Patrol | M4 |
| TC-618 | View variant product in dashboard (Read) | E2E Patrol | M4 |
| TC-619 | Edit variant product from dashboard (Update) | E2E Patrol | M4 |
| TC-620 | Delete variant product from dashboard (Delete) | E2E Patrol | M4 |
| TC-601 | 7-step wizard parity | E2E Patrol | M6 |
| TC-094 | Preview as buyer (`hideEdit=1`) | E2E Patrol | M6 |
| TC-610 | Own products hidden | E2E Patrol | M4 |

---

## All seller assignments

| ID | Final layer | Tool | Priority |
|----|-------------|------|----------|
| TC-015 | E2E | Playwright | P1 |
| TC-041 | E2E | Playwright | P0 |
| TC-042 | E2E | Playwright | P0 |
| TC-064 | E2E | Playwright | P0 |
| TC-043–046 | E2E | Playwright | P1–P2 |
| TC-047 | E2E | Playwright | P0 |
| TC-048 | API | Playwright-API | P1 |
| TC-049 | E2E | Playwright | P1 |
| TC-050 | E2E | Playwright | P1 |
| TC-051 | E2E | Playwright | P1 |
| TC-052 | Manual | Manual | P2 |
| TC-054 | API | Playwright-API | P1 |
| TC-058 | API | Playwright-API | P2 |
| TC-061 | E2E | Playwright | P2 |

### Mobile seller assignments

| ID | Final layer | Tool | Priority |
|----|-------------|------|----------|
| TC-089 | E2E | Patrol | P0 |
| TC-090–091 | E2E | Patrol | P0 |
| TC-615 | E2E | Patrol | P1 |
| TC-616 | E2E | Patrol | P1 |
| TC-617 | E2E | Patrol | P1 |
| TC-618 | E2E | Patrol | P1 |
| TC-619 | E2E | Patrol | P1 |
| TC-620 | E2E | Patrol | P1 |
| TC-092 | E2E | Patrol | P0 |
| TC-093 | E2E | Patrol | P1 |
| TC-094 | E2E | Patrol | P2 |
| TC-601 | E2E | Patrol | P2 |
| TC-605 | Manual | Manual/Patrol | P2 |
| TC-610 | E2E | Patrol | P1 |

## Added 2026-10-24 to 2026-10-27 — Seller scenarios (68, all platforms)

Layers, sources, rationale and existing-coverage candidates for every row are in **`test-strategy.md` §4c–§4d**. Included: scenarios added on 2026-10-24 and older scenarios the strategy had never assigned.

| ID | Scenario | Final layer | Tool | Priority |
|----|----------|-------------|------|----------|
| TC-128 | MyProducts page — navigate to next page | E2E | Playwright | P1 |
| TC-129 | MyProducts page — category filter resets to page 1 | E2E | Playwright | P1 |
| TC-130 | MyProducts page — next button disabled on last page | E2E | Playwright | P1 |
| TC-131 | MyProducts page — pagination hidden when products fit on one page | E2E | Playwright | P1 |
| TC-134 | Seller order list is scoped to own account (IDOR) | API | Playwright-API | P1 |
| TC-155 | Seller accepts a pending card order — payment is captured | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-156 | Seller sees the acceptance deadline only while the order is pending | Unit | Vitest | P2 |
| TC-157 | Seller cancels a pending card order with a reason — hold released, buyer sees why | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-158 | Seller pending cancellation needs a valid reason | API | Playwright-API | P1 |
| TC-159 | Seller cancels a pending COD order without any Stripe request | Multi | Vitest (integration) + Playwright | P1 |
| TC-160 | Seller cannot cancel from shipped, and cannot cancel card orders after pending | Unit | Vitest + Playwright-API | P1 |
| TC-164 | Seller approves a refund request — refund settles | Multi | Vitest (integration) + Playwright-API + Playwright | P0 |
| TC-165 | Seller rejects a refund request with a required explanation | Component | Vitest + RTL | P1 |
| TC-170 | Seller Return/Refund tab groups requests and shows a badge | Component | Vitest + RTL | P2 |
| TC-171 | Offline banner appears when the connection drops | Component | Vitest + RTL | P2 |
| TC-182 | Seller accepts a pending card order (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-183 | Seller cancels a pending order with a required reason (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-184 | Cancel is hidden when the seller may not cancel (mobile) | Component | flutter_test | P2 |
| TC-186 | Seller approves or rejects a refund request (mobile) | Multi | flutter_test + Patrol | P0 |
| TC-188 | Offline banner (mobile) | Component | flutter_test + Manual | P2 |
| TC-199 | Seller accept captures exactly the held amount | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-200 | Repeat or late accept returns 409 `order_not_pending` | API | Playwright-API | P1 |
| TC-201 | Another seller cannot accept or cancel the order | API | Playwright-API | P0 |
| TC-202 | Accept after the deadline is refused | Integration | Vitest | P1 |
| TC-204 | Accept racing cancel has exactly one winner | Integration | Vitest | P1 |
| TC-209 | Seller cancels a pending order — 200 with the payment operation | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-210 | Seller cancel validation and ownership errors | API | Playwright-API | P1 |
| TC-211 | Seller cancel conflicts and unsupported order shapes | Integration | Vitest | P1 |
| TC-212 | Seller cannot cancel a shipped order | API | Playwright-API + Vitest | P1 |
| TC-213 | `canSellerCancelPending` is derived by the server | API | Playwright-API | P1 |
| TC-219 | Refunds can be switched off | Integration | Vitest | P1 |
| TC-222 | Seller isolation and role checks on refund decisions | API | Playwright-API | P0 |
| TC-223 | Approve starts one refund; repeat and races converge | Multi | Vitest (integration) + Playwright-API | P0 |
| TC-224 | Rejection needs an explanation | Multi | Vitest + Playwright-API | P1 |
| TC-225 | A refund does not undo fulfillment | API | Playwright-API | P1 |
| TC-226 | Seller refund list pagination and filters | Unit | Vitest | P2 |
| TC-227 | Delivery records `deliveredAt` and the 7-day deadline on every path | Multi | Vitest (integration) + Playwright-API | P1 |
| TC-231 | Draft (`awaiting_payment`) orders stay hidden | Multi | Vitest + Playwright-API | P1 |
| TC-232 | Login returns a token for valid credentials | API | Playwright-API | P0 |
| TC-233 | Login rejects an invalid password | API | Playwright-API | P1 |
| TC-234 | `GET /api/auth/me` returns the logged-in user | API | Playwright-API | P1 |
| TC-246 | Seller creates a coupon; the code is stored upper case | API | Playwright-API | P1 |
| TC-247 | Coupon creation validation and duplicate codes | API | Playwright-API | P1 |
| TC-249 | A seller cannot change or delete another seller's coupon | API | Playwright-API | P0 |
| TC-250 | Seller updates and deletes their own coupon | API | Playwright-API | P2 |
| TC-252 | An applied coupon discounts the order and counts one use | API | Playwright-API | P1 |
| TC-253 | Out-of-range coupon values are rejected | Multi | Vitest + Playwright-API | P2 |
| TC-264 | The limit resets after the window | API | Playwright-API | P2 |
| TC-265 | A limit set to 0 disables rate limiting | API | Playwright-API | P2 |
| TC-269 | A spoofed forwarding header cannot bypass the limit | API | Playwright-API | P1 |
| TC-270 | Behind the real proxy, separate clients get separate buckets | Manual | Manual | P1 |
| TC-271 | The 429 response has a consistent body | API | Playwright-API | P3 |
| TC-276 | A seller cannot review their own product | API | Playwright-API | P2 |
| TC-284 | Reviews cannot be deleted | API | Playwright-API | P3 |
| TC-285 | Product ownership holds on both product route sets | API | Playwright-API | P1 |
| TC-286 | More protected routes return 401 without a token | API | Playwright-API | P1 |
| TC-287 | Malformed, expired and foreign tokens are rejected | API | Playwright-API | P1 |
| TC-289 | Signup validation | API | Playwright-API | P1 |
| TC-290 | Follow and unfollow update the counts and are idempotent | API | Playwright-API | P1 |
| TC-291 | Follow and unfollow with bad inputs | API | Playwright-API | P2 |
| TC-292 | User search | API | Playwright-API | P2 |
| TC-293 | Search text with regex characters is handled safely | API | Playwright-API | P2 |
| TC-294 | Public profile, followers and following lists | API | Playwright-API | P2 |
| TC-297 | Error responses use one envelope | API | Playwright-API | P3 |
| TC-298 | Health and root endpoints respond | API | Playwright-API | P1 |
| TC-299 | Unknown routes return a JSON 404 | API | Playwright-API | P3 |
| TC-300 | `/health` does not reflect the database | Manual | Manual | P3 |
| TC-303 | Shipping settings are required when a product is created or updated | Multi | Vitest + Playwright-API | P1 |

Full detail: **`docs/test-strategies/test-strategy.md`** · Mobile phases: **`test-strategy-mobile.md`**
