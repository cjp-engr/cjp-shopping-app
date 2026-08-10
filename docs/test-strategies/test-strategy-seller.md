# TokoMart Test Strategy — Seller (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Role filter:** Seller | Both  
**Platform:** Web + Mobile

---

## Pyramid (Seller)

| Layer | Web | Mobile |
|-------|-----|--------|
| E2E | 14 Playwright | 11 Patrol |
| API | 4 | 1 shared (TC-611) |
| Manual | 1 (TC-052) | 1 (TC-605) |
| Multi | 0 | 0 |

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
| TC-092 | E2E | Patrol | P0 |
| TC-093 | E2E | Patrol | P1 |
| TC-094 | E2E | Patrol | P2 |
| TC-601 | E2E | Patrol | P2 |
| TC-605 | Manual | Manual/Patrol | P2 |
| TC-610 | E2E | Patrol | P1 |

Full detail: **`docs/test-strategies/test-strategy.md`** · Mobile phases: **`test-strategy-mobile.md`**
