# TokoMart Test Scenarios — Seller (Filtered)

*Filtered view of `docs/test-cases/test-scenarios.md` — do not edit independently.*

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
| TC-092 | Order status pipeline | P0 | Patrol |
| TC-093 | Voucher CRUD + buyer apply | P1 | Patrol |
| TC-094 | Preview as buyer (`hideEdit=1`) | P2 | Patrol |
| TC-601 | 7-step wizard step count | P2 | Patrol |
| TC-605 | Local order notification + deep link | P2 | Manual / Patrol |

**Total seller scenarios:** 17 web + 9 mobile

Full steps, expected results, and selectors: **`docs/test-cases/test-scenarios.md`**

---

## P0 Seller Smoke

**Web:** TC-041 → TC-042 → TC-064 → TC-047  
**Mobile:** TC-089 → TC-090 → TC-091 → TC-092

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
