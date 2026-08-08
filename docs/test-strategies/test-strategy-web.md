# TokoMart Test Strategy — Web (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Platform filter:** Web | Both  
**Note:** Mobile assignments in `test-strategy-mobile.md`. Web counts unchanged.

---

## Pyramid (Web)

| Layer | Count | Tool |
|-------|-------|------|
| API | 15 | Playwright-API |
| E2E Web | 49 | Playwright |
| Multi (API + E2E) | 3 | TC-020, TC-025, TC-032 |
| Manual | 1 | TC-052 |
| Blocked | 1 | TC-062 |

---

## P0 smoke — implementation

| ID | Layer | Tool | Test file (target) |
|----|-------|------|-------------------|
| S1 | Multi | Playwright + API | `checkout.spec.ts` |
| S3 | E2E | Playwright | `seller/product-wizard.spec.ts` |
| S4 | Multi | API + Playwright | `orders.api.spec.ts` + `checkout.spec.ts` |

---

## Assignments (Web)

| ID | Final layer | Tool | Priority |
|----|-------------|------|----------|
| TC-001 | E2E | Playwright | P0 |
| TC-002 | E2E | Playwright | P1 |
| TC-003 | E2E | Playwright | P1 |
| TC-004 | E2E | Playwright | P1 |
| TC-005 | E2E | Playwright | P1 |
| TC-006 | E2E | Playwright | P1 |
| TC-007 | E2E | Playwright | P0 |
| TC-008 | E2E | Playwright | P0 |
| TC-009 | E2E | Playwright | P1 |
| TC-010 | E2E | Playwright | P1 |
| TC-011 | E2E | Playwright | P1 |
| TC-012 | E2E | Playwright | P1 |
| TC-013 | E2E | Playwright | P0 |
| TC-014 | E2E | Playwright | P1 |
| TC-015 | E2E | Playwright | P1 |
| TC-065 | E2E | Playwright | P0 |
| TC-066 | E2E | Playwright | P1 |
| TC-016 | E2E | Playwright | P0 |
| TC-017 | E2E | Playwright | P1 |
| TC-018 | E2E | Playwright | P0 |
| TC-019 | E2E | Playwright | P1 |
| TC-020 | Multi | Playwright + API | P1 |
| TC-021 | E2E | Playwright | P0 |
| TC-022 | E2E | Playwright | P0 |
| TC-023 | E2E | Playwright | P1 |
| TC-024 | E2E | Playwright | P1 |
| TC-105 | E2E | Playwright | P1 |
| TC-106 | E2E | Playwright | P1 |
| TC-025 | Multi | API + Playwright | P0 |
| TC-026 | API | Playwright-API | P0 |
| TC-027 | API | Playwright-API | P1 |
| TC-028 | API | Playwright-API | P1 |
| TC-029 | E2E | Playwright | P1 |
| TC-030 | E2E | Playwright | P1 |
| TC-031 | E2E | Playwright | P1 |
| TC-032 | Multi | Playwright + API | P1 |
| TC-033 | API | Playwright-API | P1 |
| TC-034 | E2E | Playwright | P1 |
| TC-035 | API | Playwright-API | P1 |
| TC-036 | API | Playwright-API | P1 |
| TC-037 | E2E | Playwright | P2 |
| TC-038 | E2E | Playwright | P2 |
| TC-039 | E2E | Playwright | P1 |
| TC-040 | E2E | Playwright | P2 |
| TC-041 | E2E | Playwright | P0 |
| TC-042 | E2E | Playwright | P0 |
| TC-064 | E2E | Playwright | P0 |
| TC-043 | E2E | Playwright | P1 |
| TC-044 | E2E | Playwright | P1 |
| TC-122 | E2E | Playwright | P1 |
| TC-045 | E2E | Playwright | P2 |
| TC-121 | E2E | Playwright | P2 |
| TC-046 | E2E | Playwright | P2 |
| TC-047 | E2E | Playwright | P0 |
| TC-048 | API | Playwright-API | P1 |
| TC-049 | E2E | Playwright | P1 |
| TC-050 | E2E | Playwright | P1 |
| TC-051 | E2E | Playwright | P1 |
| TC-052 | Manual | Manual | P2 |
| TC-053 | API | Playwright-API | P0 |
| TC-054 | API | Playwright-API | P1 |
| TC-055 | E2E | Playwright | P0 |
| TC-056 | API | Playwright-API | P1 |
| TC-057 | API | Playwright-API | P1 |
| TC-058 | API | Playwright-API | P2 |
| TC-059 | E2E | Playwright | P2 |
| TC-060 | E2E | Playwright | P1 |
| TC-061 | E2E | Playwright | P2 |
| TC-062 | Blocked | — | P3 |
| TC-063 | E2E | Playwright | P2 |

Full rationale and implementation order: **`docs/test-strategies/test-strategy.md`**
