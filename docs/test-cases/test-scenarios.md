# TokoMart Test Scenarios — Master Index

> **Scope:** Web (`frontend/` — React) + Mobile (`frontend-mobile/` — Flutter).  
> Web-only TCs: TC-008–009, TC-038, TC-045, TC-052, TC-059–060. Mobile-only TCs: TC-086–087, TC-604–605.

## Platform Files

| Platform | File | Coverage |
|----------|------|----------|
| Web | [test-scenarios-web.md](test-scenarios-web.md) | TC-001–066, TC-098–100, TC-105–106, TC-109, TC-112–113, TC-120–131 |
| API | [test-scenarios-api.md](test-scenarios-api.md) | TC-107–108, TC-110–111, TC-132–136 |
| Mobile | [test-scenarios-mobile.md](test-scenarios-mobile.md) | TC-067–097, TC-101–104, TC-600–624 |

---

## P0 Smoke Block

| # | Platform | Flow | Automation |
|---|----------|------|------------|
| S1 | Web | Login → add to cart → checkout COD → order appears in history | Playwright — TC-001, TC-016, TC-022, TC-098 |
| S2 | Mobile | Login → browse → cart visible | Patrol — TC-067, TC-072, TC-073 |
| S3 | Both | Become seller → create simple product → create variant product | Web: TC-041, TC-042, TC-064 · Mobile: TC-089, TC-090, TC-091 |
| S4 | Both | Cart with items from 2 sellers → checkout → 2 separate orders in history | Web: TC-021, TC-025 · Mobile: TC-083 |

---

## Summary

| Range | Count | Focus |
|-------|-------|-------|
| TC-001–040 | 40 | Buyer auth, browse, cart, checkout, orders, reviews, UI (web) |
| TC-041–052 | 12 | Seller orders, vouchers, wizard (web) |
| TC-053–055 | 3 | Security (web/API) |
| TC-132–136 | 5 | Security (API) — 401/403 enforcement, IDOR, weak password |
| TC-114–119 | 6 | Rate limiting — headers, decrement, 429 enforcement |
| TC-056–059 | 4 | Edge cases (web) |
| TC-060–063 | 4 | Platform parity (web perspective) |
| TC-064–066 | 3 | Seller variant listing + buyer catalog (web) |
| TC-098–100 | 3 | Buyer variant checkout + cart (web) |
| TC-120–122 | 3 | Seller variant product CRUD — web (edit, My Products, add) |
| TC-123–127 | 5 | Web Products page pagination (numbered, server-side) |
| TC-128–131 | 4 | Web MyProducts page pagination (numbered, client-side) |
| TC-067–094, TC-095–097 | 31 | Mobile happy path — auth, browse, cart, checkout, orders, wishlist, seller |
| TC-101–102 | 2 | Buyer variant checkout + guard (mobile) |
| TC-607–614 | 6 | Mobile session, UI, negative, edge |
| TC-600–606, TC-608–611 | 11 | Mobile platform parity & security |
| TC-604–605 | (in above) | Mobile-only notifications |
| TC-615–620 | 6 | Mobile seller product CRUD — simple and variant |
| TC-621–624 | 4 | Mobile product list infinite scroll pagination |
| **Total** | **152** | Web (84) + Mobile-native (63) + API security (5) |

**Automation split:** Playwright E2E (~60 web), Patrol E2E (~45 mobile, many blocked on missing keys), Playwright-API (~15), Manual/Blocked (~5)
