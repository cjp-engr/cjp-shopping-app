# TokoMart Test Scenarios — Buyer (Filtered)

*Filtered view of `docs/test-cases/test-scenarios.md` — do not edit independently.*

**Role filter:** Buyer | Both  
**Platform:** Web + Mobile

---

## Buyer Scenario Index — Web

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-001 | Successful login | P0 | Playwright |
| TC-002 | Login failure | P1 | Playwright |
| TC-003 | Successful signup | P1 | Playwright |
| TC-004 | Signup weak password | P1 | Playwright |
| TC-005 | Logout | P1 | Playwright |
| TC-006 | Cart restored on re-login | P1 | Playwright |
| TC-007 | Checkout auth redirect | P0 | Playwright |
| TC-008 | Guest browse products | P0 | Playwright |
| TC-009 | Guest view cart | P1 | Playwright |
| TC-010 | Search products | P1 | Playwright |
| TC-011 | Filter by category | P1 | Playwright |
| TC-012 | Sale strikethrough price | P1 | Playwright |
| TC-013 | Variant selection add to cart | P0 | Playwright |
| TC-014 | Add blocked without variant | P1 | Playwright |
| TC-015 | Own products hidden (seller view) | P1 | Playwright |
| TC-065 | Buyer sees new seller listing in catalog | P0 | Playwright |
| TC-066 | Buyer finds listing via search/category | P1 | Playwright |
| TC-016 | Cart qty update/remove | P0 | Playwright |
| TC-017 | Qty capped at stock | P1 | Playwright |
| TC-018 | Per-seller delivery | P0 | Playwright |
| TC-019 | Apply valid voucher | P1 | Playwright |
| TC-020 | Invalid voucher | P1 | Playwright |
| TC-021 | Multi-seller cart groups | P0 | Playwright |
| TC-022 | Checkout COD | P0 | Playwright |
| TC-098 | Checkout COD with variant product | P0 | Playwright |
| TC-023 | Checkout saved card | P1 | Playwright |
| TC-024 | Checkout new card | P1 | Playwright |
| TC-098 | Checkout COD with variant product | P0 | Playwright |
| TC-099 | Variant checkout insufficient stock | P1 | Playwright / Playwright-API |
| TC-100 | Two variants same product in cart | P1 | Playwright |
| TC-025 | Multi-seller → 2 orders | P0 | Playwright |
| TC-026 | Order total formula | P0 | Playwright-API |
| TC-027 | Shipping $9.99 under $50 | P1 | Playwright-API |
| TC-028 | Free shipping ≥ $50 | P1 | Playwright-API |
| TC-029 | Missing address blocked | P1 | Playwright |
| TC-030 | Order history tabs | P1 | Playwright |
| TC-031 | Confirm receipt | P1 | Playwright |
| TC-032 | Buyer cancel pending | P1 | Playwright |
| TC-033 | Cancel processing blocked | P1 | Playwright-API |
| TC-034 | Leave review | P1 | Playwright |
| TC-035 | Duplicate review blocked | P1 | Playwright-API |
| TC-036 | Review before delivery blocked | P1 | Playwright-API |
| TC-037 | Follow/unfollow seller | P2 | Playwright |
| TC-038 | Dark mode toggle | P2 | Playwright |
| TC-039 | Order card persisted total | P1 | Playwright |
| TC-040 | Products loading/empty | P2 | Playwright |
| TC-050 | Voucher create + apply E2E | P1 | Playwright |
| TC-053 | Buyer blocked seller API | P0 | Playwright-API |
| TC-055 | Protected route auth | P0 | Playwright |
| TC-056 | Insufficient stock at checkout | P1 | Playwright-API |
| TC-057 | Coupon min order | P1 | Playwright-API |
| TC-059 | Stale cart cleanup | P2 | Playwright |
| TC-060 | Guest catalog access | P1 | Playwright |
| TC-062 | Wishlist N/A on web | P3 | Blocked |
| TC-063 | All cart items checkout | P2 | Playwright |

---

## Buyer Scenario Index — Mobile

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-067 | Mobile login smoke | P0 | Patrol |
| TC-068 | Auth gate redirect | P0 | Patrol |
| TC-069 | Redirect from login when authed | P1 | Patrol |
| TC-070 | Mobile signup | P1 | Patrol |
| TC-071 | Mobile logout | P1 | Patrol |
| TC-607 | Cart restored on re-login | P1 | Patrol |
| TC-072 | Browse products home | P0 | Patrol |
| TC-073 | Open cart (S2 smoke) | P0 | Patrol |
| TC-074 | Search products | P1 | Patrol |
| TC-075 | Filter by category | P1 | Patrol |
| TC-076 | Variant + add to cart | P0 | Patrol |
| TC-609 | Sale strikethrough | P1 | Patrol |
| TC-608 | Sees seller listing in catalog | P0 | Patrol |
| TC-077 | Cart update/remove | P0 | Patrol |
| TC-078 | Checkbox subset checkout | P0 | Patrol |
| TC-079 | Checkout disabled — no selection | P1 | Patrol |
| TC-080 | Select all / deselect all | P2 | Patrol |
| TC-081 | Per-seller delivery | P0 | Patrol |
| TC-082 | Voucher via route extra | P1 | Patrol |
| TC-095 | COD checkout | P0 | Patrol |
| TC-096 | Checkout saved card | P1 | Patrol |
| TC-097 | Checkout new card | P1 | Patrol |
| TC-101 | COD checkout with variant product | P0 | Patrol |
| TC-102 | Add blocked without variant (Patrol) | P1 | Patrol |
| TC-083 | Multi-seller → 2 orders | P0 | Patrol |
| TC-084 | Order history + detail | P1 | Patrol |
| TC-085 | Confirm receipt | P1 | Patrol |
| TC-612 | Invalid login | P1 | Patrol |
| TC-613 | Variant required | P1 | Patrol |
| TC-614 | Qty stock cap | P1 | Patrol |
| TC-086 | Wishlist add/remove | P1 | Patrol |
| TC-087 | Wishlist clear all | P2 | Patrol |
| TC-088 | Follow/unfollow seller | P2 | Patrol |
| TC-611 | Blocked from seller routes | P0 | Patrol + API |
| TC-600 | Auth gate (no guest browse) | P1 | Patrol |
| TC-602 | Checkbox vs web all-items | P2 | Patrol |
| TC-603 | Wishlist in-memory | P3 | Blocked |
| TC-604 | Notifications bell stub | P3 | Manual |
| TC-606 | 6-char password signup | P2 | Patrol |

**Total buyer scenarios:** ~50 web + ~35 mobile (overlap via parity on shared business rules)

Full steps and selectors: **`docs/test-cases/test-scenarios.md`**

---

## P0 Buyer Smoke

**Web:** TC-001 → TC-013 → TC-016 → TC-022 → TC-098 → TC-030  
**Mobile:** TC-067 → TC-072 → TC-073 → TC-076 → TC-101 → TC-095 → TC-084  
**Multi-seller:** Web TC-021+025 · Mobile TC-083
