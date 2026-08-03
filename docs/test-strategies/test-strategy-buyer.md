# TokoMart Test Strategy — Buyer (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Role filter:** Buyer | Both

---

## Pyramid (Buyer)

| Layer | Count |
|-------|-------|
| E2E Web | 38 |
| API | 11 |
| Multi | 3 |
| Manual | 0 |
| Blocked | 1 (TC-062) |

---

## P0 buyer — build first

| ID | Layer | Tool | Target file |
|----|-------|------|-------------|
| TC-001 | E2E | Playwright | `login.spec.ts` |
| TC-007 | E2E | Playwright | `login.spec.ts` |
| TC-008 | E2E | Playwright | `products/catalog.spec.ts` |
| TC-013 | E2E | Playwright | `products/catalog.spec.ts` |
| TC-016 | E2E | Playwright | `cart.spec.ts` |
| TC-018 | E2E | Playwright | `cart.spec.ts` |
| TC-021 | E2E | Playwright | `cart.spec.ts` |
| TC-022 | E2E | Playwright | `checkout.spec.ts` |
| TC-025 | Multi | API + Playwright | `orders.api.spec.ts` + checkout |
| TC-026 | API | Playwright-API | `orders.api.spec.ts` |
| TC-053 | API | Playwright-API | `seller.api.spec.ts` |
| TC-055 | E2E | Playwright | `login.spec.ts` |
| TC-065 | E2E | Playwright | `products/catalog.spec.ts` |

---

## All buyer assignments

| ID | Final layer | Tool | Priority |
|----|-------------|------|----------|
| TC-001–014 | E2E | Playwright | P0–P1 |
| TC-065–066 | E2E | Playwright | P0–P1 |
| TC-016–024 | E2E | Playwright | P0–P1 |
| TC-025 | Multi | API + Playwright | P0 |
| TC-026–028 | API | Playwright-API | P0–P1 |
| TC-029–031 | E2E | Playwright | P1 |
| TC-032 | Multi | Playwright + API | P1 |
| TC-033 | API | Playwright-API | P1 |
| TC-034 | E2E | Playwright | P1 |
| TC-035–036 | API | Playwright-API | P1 |
| TC-037 | E2E | Playwright | P2 |
| TC-038–040 | E2E | Playwright | P2 |
| TC-050 | E2E | Playwright | P1 |
| TC-053 | API | Playwright-API | P0 |
| TC-055–057 | API/E2E | Mixed | P0–P1 |
| TC-056 | API | Playwright-API | P1 |
| TC-059–060 | E2E | Playwright | P2–P1 |
| TC-062 | Blocked | — | P3 |
| TC-063 | E2E | Playwright | P2 |

Full detail: **`docs/test-strategies/test-strategy.md`**
