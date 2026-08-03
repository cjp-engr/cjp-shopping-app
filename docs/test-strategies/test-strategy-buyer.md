# TokoMart Test Strategy — Buyer (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Role filter:** Buyer | Both  
**Platform:** Web + Mobile

---

## Pyramid (Buyer)

| Layer | Web | Mobile |
|-------|-----|--------|
| E2E | 38 Playwright | 30 Patrol |
| API | 11 | 3 shared legs |
| Multi | 3 | 1 (TC-083) |
| Manual | 0 | 1 (TC-604) |
| Blocked | 1 (TC-062) | 1 (TC-603) |

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

### P0 buyer — Mobile (Patrol)

| ID | Layer | Tool | Target file | Phase |
|----|-------|------|-------------|-------|
| TC-067 | E2E | Patrol | `login_test.dart` | M1 — **exists** |
| TC-068 | E2E | Patrol | `auth_gate_test.dart` | M2 |
| TC-072 | E2E | Patrol | `login_test.dart` | M1 |
| TC-073 | E2E | Patrol | `login_test.dart` | M1 |
| TC-076 | E2E | Patrol | `product_detail_test.dart` | M2 |
| TC-078 | E2E | Patrol | `cart_checkbox_test.dart` | M2 |
| TC-095 | E2E | Patrol | `checkout_cod_test.dart` | M2 |
| TC-083 | Multi | Patrol + API | `multi_seller_checkout_test.dart` | M4 |
| TC-608 | E2E | Patrol | `catalog_test.dart` | M4 |
| TC-611 | Multi | Patrol + API | `security_test.dart` | M5 |

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

### Mobile buyer assignments

| ID | Final layer | Tool | Priority |
|----|-------------|------|----------|
| TC-067–071, TC-607 | E2E | Patrol | P0–P1 |
| TC-072–076, TC-609, TC-608 | E2E | Patrol | P0–P1 |
| TC-077–082, TC-095 | E2E | Patrol | P0–P1 |
| TC-083 | Multi | Patrol + API | P0 |
| TC-084–085, TC-612–614 | E2E | Patrol | P1 |
| TC-086–087 | E2E | Patrol | P1–P2 |
| TC-088 | E2E | Patrol | P2 |
| TC-600, TC-602, TC-606 | E2E | Patrol | P1–P2 |
| TC-603 | Blocked | — | P3 |
| TC-604 | Manual | Manual | P3 |
| TC-611 | Multi | Patrol + API | P0 |

Full detail: **`docs/test-strategies/test-strategy.md`** · Mobile phases: **`test-strategy-mobile.md`**
