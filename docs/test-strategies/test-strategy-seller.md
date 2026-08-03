# TokoMart Test Strategy — Seller (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Role filter:** Seller | Both

---

## Pyramid (Seller)

| Layer | Count |
|-------|-------|
| E2E Web | 14 |
| API | 4 |
| Manual | 1 |
| Multi | 0 |

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

Full detail: **`docs/test-strategies/test-strategy.md`**
