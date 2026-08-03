# TokoMart Test Scenarios — Mobile (Filtered)

*Filtered view of `docs/test-cases/test-scenarios.md` — do not edit independently.*

**Platform filter:** Mobile | Both  
**Scope:** Master doc was generated as **web-only**. No mobile scenarios included in this run.

---

## P0 Smoke — Mobile (reference only)

| # | Platform | Flow | Status |
|---|----------|------|--------|
| S2 | Mobile | Login (reference `frontend-mobile/patrol_test/login_test.dart`) → browse → cart visible | **Not in web suite** — generate with `/create-scenarios mobile` |

---

## Mobile-only scenarios (not yet documented)

Run `/create-scenarios generate test cases for mobile only` to produce:

| Area | Examples |
|------|----------|
| Auth gate | Unauthenticated redirect to `/login` on all routes |
| Wishlist | In-memory wishlist tab |
| Cart selection | Checkbox subset → checkout with route `extra` |
| Seller wizard | 7-step flow with variant images + permission |
| Notifications | Bell stub; seller order polling + deep link |

---

## Platform parity TCs in master (mobile perspective)

| TC ID | Note |
|-------|------|
| TC-062 | Wishlist — Mobile-only; Blocked on web |
| TC-061 | Wizard — mobile has 7 steps vs web 6 |
| TC-063 | Cart — mobile requires checkbox selection |
| TC-008 | Guest browse — Web-only |
| TC-038 | Dark mode — Web-only |

See **`docs/test-cases/test-scenarios.md`** for full web suite and parity notes.
