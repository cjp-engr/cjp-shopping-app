# TokoMart Test Scenarios — Seller (Filtered)

*Derived role index of the Web, API and Mobile scenario files; `test-scenarios.md` is the master index. Update this view together with its platform sources.*

Automation labels below identify intended tools, not implemented or passing scripts. Read the platform case's tracking fields for implementation status, script mapping and run evidence. Repeated references in the journey/parity summaries are navigation aids, not extra test cases.

**Role filter:** Seller | Both  
**Platform:** Web + Mobile

---

## Seller Scenario Index — Web

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-015 | Own products hidden from listing | P1 | Playwright |
| TC-041 | Become seller | P0 | Playwright |
| TC-042 | **Simple product listing** (6-step wizard) | P0 | Playwright |
| TC-064 | **Variant product listing** | P0 | Playwright |
| TC-043 | Wizard validation | P1 | Playwright |
| TC-044 | Edit product price/stock | P1 | Playwright |
| TC-045 | My Products preview | P2 | Playwright |
| TC-046 | Delete product | P2 | Playwright |
| TC-047 | Order status pipeline | P0 | Playwright |
| TC-048 | Invalid status transition | P1 | Playwright-API |
| TC-049 | Seller cancel order | P1 | Playwright |
| TC-050 | Voucher create + apply E2E | P1 | Playwright |
| TC-051 | Formatted payment/delivery labels | P1 | Playwright |
| TC-052 | New order toast (polling) | P2 | Manual/Playwright |
| TC-054 | Cross-seller product edit blocked | P1 | Playwright-API |
| TC-058 | Description max 200 chars | P2 | Playwright-API |
| TC-061 | Web 6-step wizard parity | P2 | Playwright |
| TC-155 | Accept pending card order, payment captured | P0 | Playwright |
| TC-156 | Acceptance deadline shown while pending | P2 | Playwright / Component |
| TC-157 | Cancel pending card order with reason; buyer sees why | P0 | Playwright |
| TC-158 | Cancel reason required (1–1000) | P1 | Playwright |
| TC-159 | Cancel pending COD order, no Stripe | P1 | Playwright |
| TC-160 | No cancel from shipped; no card cancel after pending | P1 | Playwright |
| TC-164 | Approve refund request; refund settles | P0 | Playwright |
| TC-165 | Reject refund with required reason | P1 | Playwright |
| TC-170 | Return/Refund tab groups and badge | P2 | Playwright / Component |
| TC-171 | Offline banner | P2 | Playwright |

### Seller API scenarios added 2026-10-24

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-199 | Accept captures exactly the held amount | P0 | Playwright-API |
| TC-200 | Repeat accept → 409 `order_not_pending` | P1 | Playwright-API |
| TC-201 | Other seller cannot accept or cancel | P0 | Playwright-API |
| TC-202 | Accept after deadline refused | P1 | Blocked |
| TC-203 | Auto-cancel at the deadline | P1 | Manual / Blocked |
| TC-204 | Accept vs cancel race, one winner | P1 | Blocked |
| TC-209 | Seller cancel pending: 200 + paymentOperation | P0 | Playwright-API |
| TC-210 | Seller cancel validation and ownership | P1 | Playwright-API |
| TC-211 | Seller cancel conflicts and unsupported shapes | P1 | Playwright-API |
| TC-212 | Seller cannot cancel shipped | P1 | Playwright-API |
| TC-213 | `canSellerCancelPending` derivation | P1 | Playwright-API |
| TC-222 | Seller isolation on refund decisions | P0 | Playwright-API |
| TC-223 | Approve starts one refund; races converge | P0 | Playwright-API / Integration |
| TC-224 | Rejection needs an explanation | P1 | Playwright-API |
| TC-226 | Seller refund list pagination and filters | P2 | Playwright-API |
| TC-227 | Delivery timestamps on every path | P1 | Playwright-API / Integration |
| TC-231 | Drafts and manual-capture orders hidden from sellers | P1 | Playwright-API |
| TC-232 | Login returns a token | P0 | Playwright-API |
| TC-233 | Login rejects an invalid password | P1 | Playwright-API |
| TC-234 | `GET /api/auth/me` returns the user | P1 | Playwright-API |
| TC-246 | Create coupon, code stored upper case | P1 | Playwright-API |
| TC-247 | Coupon creation validation and duplicates | P1 | Playwright-API |
| TC-249 | Cannot change another seller's coupon | P0 | Playwright-API |
| TC-250 | Update and delete own coupon | P2 | Playwright-API |
| TC-252 | Applied coupon discounts order, counts one use | P1 | Playwright-API |
| TC-253 | Out-of-range coupon values rejected | P2 | Playwright-API / Unit |
| TC-264 | Rate limit resets after the window | P2 | Playwright-API |
| TC-265 | Limit set to 0 disables rate limiting | P2 | Playwright-API |
| TC-269 | Spoofed forwarding header cannot bypass limit | P1 | Playwright-API |
| TC-270 | Separate clients behind the proxy | P1 | Manual |
| TC-271 | 429 response body is consistent | P3 | Playwright-API |
| TC-276 | Seller cannot review own product | P2 | Playwright-API |
| TC-284 | Reviews cannot be deleted | P3 | Playwright-API |
| TC-285 | Product ownership on both route sets | P1 | Playwright-API |
| TC-286 | More protected routes return 401 without a token | P1 | Playwright-API |
| TC-287 | Malformed, expired, foreign tokens rejected | P1 | Playwright-API |
| TC-289 | Signup validation | P1 | Playwright-API |
| TC-290 | Follow/unfollow counts and idempotence | P1 | Playwright-API |
| TC-291 | Follow/unfollow bad inputs | P2 | Playwright-API |
| TC-292 | User search | P2 | Playwright-API |
| TC-293 | Search text with regex characters | P2 | Playwright-API |
| TC-294 | Public profile, followers, following | P2 | Playwright-API |
| TC-297 | Error responses use one envelope | P3 | Playwright-API |
| TC-298 | Health and root endpoints respond | P1 | Playwright-API |
| TC-299 | Unknown routes return JSON 404 | P3 | Playwright-API |
| TC-300 | /health does not reflect the database | P3 | Manual |
| TC-303 | Shipping settings required on product create and update | P1 | Playwright-API / Unit |
| TC-304 | Create product: name, description, price and category are required | P1 | Playwright-API |
| TC-305 | Create product: optional fields and defaults; read-only fields ignored | P2 | Playwright-API |
| TC-306 | Create product: price, stock, category, description, discount, condition, variants | P1 | Playwright-API |
| TC-307 | Update product: partial updates, blank values and value rules | P1 | Playwright-API |
| TC-308 | Update product: 404, 400 bad id, 403 before validation | P2 | Playwright-API |
| TC-309 | Malformed JSON in shipping and variant fields | P2 | Playwright-API |
| TC-310 | Empty price or stock rejected; empty discount ignored | P2 | Playwright-API |
| TC-311 | Spaces around text, tags and variant attributes are trimmed | P2 | Playwright-API / Unit |

---

## Seller Scenario Index — Mobile

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-610 | Own products hidden (mobile) | P1 | Patrol |
| TC-089 | Become seller | P0 | Patrol |
| TC-090 | **Simple product — 7-step wizard** | P0 | Patrol |
| TC-091 | **Variant product — 7-step wizard** | P0 | Patrol |
| TC-615 | Seller views simple product in dashboard (Read) | P1 | Patrol |
| TC-616 | Seller edits simple product from dashboard (Update) | P1 | Patrol |
| TC-617 | Seller deletes simple product from dashboard (Delete) | P1 | Patrol |
| TC-618 | Seller views variant product in dashboard (Read) | P1 | Patrol |
| TC-619 | Seller edits variant product from dashboard (Update) | P1 | Patrol |
| TC-620 | Seller deletes variant product from dashboard (Delete) | P1 | Patrol |
| TC-092 | Order status pipeline | P0 | Patrol |
| TC-093 | Voucher CRUD + buyer apply | P1 | Patrol |
| TC-094 | Preview as buyer (`hideEdit=1`) | P2 | Patrol |
| TC-601 | 7-step wizard step count | P2 | Patrol |
| TC-605 | Local order notification + deep link | P2 | Manual / Patrol |
| TC-182 | Accept pending card order | P0 | Patrol |
| TC-183 | Cancel pending order, reason required | P0 | Patrol |
| TC-184 | Cancel hidden when not allowed | P2 | Patrol / Widget |
| TC-186 | Approve or reject a refund request | P0 | Patrol (keys missing) |
| TC-188 | Offline banner | P2 | Manual / Widget |

**Added 2026-10-24 and 2026-10-25:** 10 web + 5 mobile + 55 API seller-facing scenarios

Full steps, expected results, and selectors: **`docs/test-cases/test-scenarios.md`**

---

## P0 Seller Smoke

**Web:** TC-041 → TC-042 → TC-064 → TC-047  
**Mobile:** TC-089 → TC-090 → TC-091 → TC-092  
**Accept / cancel / refund (flags needed, see master):** Web TC-155 → TC-157 → TC-164 · Mobile TC-182 → TC-183 → TC-186 · API TC-199, TC-209, TC-223

---

## Product listing coverage

| Platform | Simple listing | Variant listing | Preview |
|----------|----------------|-----------------|---------|
| Web | TC-042 (6-step) | TC-064 | TC-045 `/my-products` |
| Mobile | TC-090 (7-step) | TC-091 | TC-094 `?hideEdit=1` |

**Buyer visibility:** TC-065/066 (web) · TC-608 (mobile)

---

## Platform-specific seller features

| TC ID | Platform | Feature |
|-------|----------|---------|
| TC-045 | Web | `/my-products` buyer-view preview |
| TC-052 | Web | In-app toast for new orders (polling) |
| TC-061 | Web | 6-step wizard |
| TC-601 | Mobile | 7-step wizard (variants separate) |
| TC-605 | Mobile | Local notification → `/seller?tab=orders` |
| TC-170 / TC-186 | Web / Mobile | Return/Refund tab with In Progress, Approved, Rejected groups and a badge |
