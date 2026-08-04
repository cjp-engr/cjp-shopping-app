# TokoMart Test Scenarios — Web (Filtered)

*Filtered view of `docs/test-cases/test-scenarios.md` — do not edit independently.*

**Platform filter:** Web | Both  
**Scope:** 69 web-applicable TCs; mobile-native TCs excluded (see `test-scenarios-mobile.md`).

---

## P0 Smoke — Web

| # | Flow | TC IDs |
|---|------|--------|
| S1 | Login → cart → checkout COD → order history | TC-001, TC-016, TC-022, TC-098 |
| S3 | Become seller → simple listing (TC-042) → variant listing (TC-064) | TC-041, TC-042, TC-064 |
| S4 | 2-seller cart → 2 orders | TC-021, TC-025 |

---

## Scenario Index (Web)

| TC ID | Title | Priority | Role | Automation |
|-------|-------|----------|------|------------|
| TC-001 | Successful login | P0 | Buyer | Playwright |
| TC-002 | Login failure | P1 | Buyer | Playwright |
| TC-003 | Successful signup | P1 | Buyer | Playwright |
| TC-004 | Signup weak password | P1 | Buyer | Playwright |
| TC-005 | Logout | P1 | Buyer | Playwright |
| TC-006 | Cart restored on re-login | P1 | Buyer | Playwright |
| TC-007 | Checkout auth redirect | P0 | Buyer | Playwright |
| TC-008 | Guest browse products | P0 | Buyer | Playwright |
| TC-009 | Guest view cart | P1 | Buyer | Playwright |
| TC-010 | Search products | P1 | Buyer | Playwright |
| TC-011 | Filter by category | P1 | Buyer | Playwright |
| TC-012 | Sale strikethrough price | P1 | Buyer | Playwright |
| TC-013 | Variant selection add to cart | P0 | Buyer | Playwright |
| TC-014 | Add blocked without variant | P1 | Buyer | Playwright |
| TC-015 | Own products hidden from listing | P1 | Seller | Playwright |
| TC-065 | Buyer sees new seller listing in catalog | P0 | Buyer | Playwright |
| TC-066 | Buyer finds listing via search/category | P1 | Buyer | Playwright |
| TC-016 | Cart qty update/remove | P0 | Buyer | Playwright |
| TC-017 | Qty capped at stock | P1 | Buyer | Playwright |
| TC-018 | Per-seller delivery | P0 | Buyer | Playwright |
| TC-019 | Apply valid voucher | P1 | Buyer | Playwright |
| TC-020 | Invalid voucher | P1 | Buyer | Playwright |
| TC-021 | Multi-seller cart groups | P0 | Buyer | Playwright |
| TC-022 | Checkout COD | P0 | Buyer | Playwright |
| TC-023 | Checkout saved card | P1 | Buyer | Playwright |
| TC-024 | Checkout new card | P1 | Buyer | Playwright |
| TC-098 | Checkout COD with variant product | P0 | Buyer | Playwright |
| TC-099 | Variant checkout insufficient stock | P1 | Buyer | Playwright / Playwright-API |
| TC-100 | Two variants same product in cart | P1 | Buyer | Playwright |
| TC-025 | Multi-seller → 2 orders | P0 | Buyer | Playwright |
| TC-026 | Order total formula | P0 | Buyer | Playwright-API |
| TC-027 | Shipping $9.99 under $50 | P1 | Buyer | Playwright-API |
| TC-028 | Free shipping ≥ $50 | P1 | Buyer | Playwright-API |
| TC-029 | Missing address blocked | P1 | Buyer | Playwright |
| TC-030 | Order history tabs | P1 | Buyer | Playwright |
| TC-031 | Confirm receipt | P1 | Buyer | Playwright |
| TC-032 | Buyer cancel pending | P1 | Buyer | Playwright |
| TC-033 | Cancel processing blocked | P1 | Buyer | Playwright-API |
| TC-034 | Leave review | P1 | Buyer | Playwright |
| TC-035 | Duplicate review blocked | P1 | Buyer | Playwright-API |
| TC-036 | Review before delivery blocked | P1 | Buyer | Playwright-API |
| TC-037 | Follow/unfollow seller | P2 | Buyer | Playwright |
| TC-038 | Dark mode toggle | P2 | Buyer | Playwright |
| TC-039 | Order card persisted total | P1 | Buyer | Playwright |
| TC-040 | Products loading/empty | P2 | Buyer | Playwright |
| TC-041 | Become seller | P0 | Seller | Playwright |
| TC-042 | Seller creates simple product listing | P0 | Seller | Playwright |
| TC-064 | Seller creates variant product listing | P0 | Seller | Playwright |
| TC-043 | Wizard validation | P1 | Seller | Playwright |
| TC-044 | Edit product price/stock | P1 | Seller | Playwright |
| TC-045 | My Products preview | P2 | Seller | Playwright |
| TC-046 | Delete product | P2 | Seller | Playwright |
| TC-047 | Order status pipeline | P0 | Seller | Playwright |
| TC-048 | Invalid status transition | P1 | Seller | Playwright-API |
| TC-049 | Seller cancel order | P1 | Seller | Playwright |
| TC-050 | Voucher create + apply E2E | P1 | Both | Playwright |
| TC-051 | Formatted payment/delivery labels | P1 | Seller | Playwright |
| TC-052 | New order toast | P2 | Seller | Manual/Playwright |
| TC-053 | Buyer blocked seller API | P0 | Buyer | Playwright-API |
| TC-054 | Cross-seller product edit blocked | P1 | Seller | Playwright-API |
| TC-055 | Protected route auth | P0 | Buyer | Playwright |
| TC-056 | Insufficient stock at checkout | P1 | Buyer | Playwright-API |
| TC-057 | Coupon min order | P1 | Buyer | Playwright-API |
| TC-058 | Description max 200 chars | P2 | Seller | Playwright-API |
| TC-059 | Stale cart cleanup | P2 | Buyer | Playwright |
| TC-060 | Guest catalog access | P1 | Buyer | Playwright |
| TC-061 | Web 6-step wizard parity | P2 | Seller | Playwright |
| TC-062 | Wishlist N/A on web | P3 | Buyer | Blocked |
| TC-063 | All cart items checkout | P2 | Buyer | Playwright |

Full steps, expected results, and selectors: **`docs/test-cases/test-scenarios.md`**
