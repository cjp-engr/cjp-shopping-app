# TokoMart Test Strategy — Mobile (Filtered)

*Filtered view of `docs/test-strategies/test-strategy.md` — do not edit independently.*

**Platform filter:** Mobile | Both  
**Note:** Scenario suite is web-only today. Mobile strategy is partial.

---

## Assignments (Mobile)

| ID | Scenario | Final layer | Tool | Priority | Status |
|----|----------|-------------|------|----------|--------|
| S2 | Login → browse → cart | E2E | Patrol | P0 | Partial — `login_test.dart` only |
| TC-062 | Wishlist | Blocked | — | P3 | Mobile-only; no web test |

---

## Gaps (generate mobile scenarios first)

| Area | Tool | Unblocker |
|------|------|-----------|
| Auth gate redirect | Patrol | `/create-scenarios mobile` |
| 7-step seller wizard | Patrol | Mobile scenarios + keys |
| Cart checkbox checkout | Patrol | Mobile scenarios |
| Wishlist | Patrol | Mobile scenarios |
| Variant image permission | Patrol | Native dialog handling |

---

## When mobile suite exists

Re-run `/test-strategy mobile` to assign Patrol layers for all `Platform: Mobile | Both` scenarios.

Full master strategy: **`docs/test-strategies/test-strategy.md`**
