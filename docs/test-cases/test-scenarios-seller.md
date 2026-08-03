# TokoMart Test Scenarios — Seller (Filtered)

*Filtered view of `docs/test-cases/test-scenarios.md` — do not edit independently.*

**Role filter:** Seller | Both  
**Platform:** Web (from web-only master)

---

## Seller Scenario Index

| TC ID | Title | Priority | Automation |
|-------|-------|----------|------------|
| TC-015 | Own products hidden from listing | P1 | Playwright |
| TC-041 | Become seller | P0 | Playwright |
| TC-042 | **Seller creates simple product listing** (6-step wizard) | P0 | Playwright |
| TC-064 | **Seller creates variant product listing** | P0 | Playwright |
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

**Total seller scenarios:** 17

Full steps, expected results, and selectors: **`docs/test-cases/test-scenarios.md`**

---

## P0 Seller Smoke (Web)

1. **TC-041** Become seller → **TC-042** create **simple** product listing → verify `product-item-{id}` on dashboard
2. **TC-064** Create **variant** product listing → verify variant selectors on detail page
3. **TC-047** Advance buyer order: pending → preparing → processing → shipped

---

## Product listing coverage

| TC ID | What it verifies |
|-------|------------------|
| TC-042 | Simple product — full 6-step wizard, dashboard + direct URL |
| TC-064 | Variant product — attributes, per-variant price/stock |
| TC-043 | Wizard validation failures |
| TC-044 | Edit existing listing |
| TC-045 | Preview as buyer (`/my-products`) |
| TC-046 | Delete listing |

**Buyer visibility** (separate buyer TCs): TC-065 catalog grid, TC-066 search/filter — see `test-scenarios-buyer.md`.

---

## Web-only seller features

| TC ID | Feature |
|-------|---------|
| TC-045 | `/my-products` buyer-view preview |
| TC-052 | In-app toast for new orders (polling) |
| TC-061 | 6-step wizard (mobile has 7 steps) |
