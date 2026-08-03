# TokoMart Test Scenarios — Buyer (Filtered)

*Filtered view of `docs/test-cases/test-scenarios.md` — do not edit independently.*

**Role filter:** Buyer | Both  
**Platform:** Web (from web-only master)

---

## Buyer Scenario Index

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
| TC-065 | **Buyer sees new seller listing in catalog** | P0 | Playwright |
| TC-066 | **Buyer finds listing via search/category** | P1 | Playwright |
| TC-016 | Cart qty update/remove | P0 | Playwright |
| TC-017 | Qty capped at stock | P1 | Playwright |
| TC-018 | Per-seller delivery | P0 | Playwright |
| TC-019 | Apply valid voucher | P1 | Playwright |
| TC-020 | Invalid voucher | P1 | Playwright |
| TC-021 | Multi-seller cart groups | P0 | Playwright |
| TC-022 | Checkout COD | P0 | Playwright |
| TC-023 | Checkout saved card | P1 | Playwright |
| TC-024 | Checkout new card | P1 | Playwright |
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

**Total buyer scenarios:** 50 (excludes seller-only TC-041–052, TC-054, TC-058, TC-061, TC-064)

Full steps and selectors: **`docs/test-cases/test-scenarios.md`**

---

## P0 Buyer Smoke (Web)

1. **TC-001** Login → **TC-013** add variant product → **TC-016** cart → **TC-022** checkout COD → verify order in **TC-030** history
2. **TC-008** Guest browse (no auth) → **TC-007** checkout requires login
3. **TC-021 + TC-025** Multi-seller cart → 2 orders with independent totals
