# TokoMart Test Scenarios — Mobile (Filtered)

*Filtered view of `docs/test-cases/test-scenarios.md` — do not edit independently.*

**Platform filter:** Mobile | Both  
**Scope:** 66 web TCs with `Parity: Both` apply to mobile via Patrol; 38 mobile-native TCs below.

---

## P0 Smoke — Mobile

| # | Flow | TC IDs |
|---|------|--------|
| S2 | Login → browse → cart visible | TC-067, TC-072, TC-073 |
| S3 | Become seller → simple + variant listing | TC-089, TC-090, TC-091 |
| S4 | 2-seller cart → 2 orders | TC-083 |
| S5 | Variant select → COD checkout | TC-076, TC-101 |

**Patrol baseline:** `frontend-mobile/patrol_test/login_test.dart` (TC-067)

---

## Mobile Scenario Index

| TC ID | Title | Priority | Role | Automation |
|-------|-------|----------|------|------------|
| TC-067 | Mobile login smoke (Patrol baseline) | P0 | Buyer | Patrol |
| TC-068 | Auth gate redirect to login | P0 | Buyer | Patrol |
| TC-069 | Authenticated redirect from login | P1 | Buyer | Patrol |
| TC-070 | Mobile signup (6-char password) | P1 | Buyer | Patrol |
| TC-071 | Mobile logout | P1 | Buyer | Patrol |
| TC-607 | Cart restored after re-login | P1 | Buyer | Patrol |
| TC-072 | Browse products home | P0 | Buyer | Patrol |
| TC-073 | Open cart from products (S2) | P0 | Buyer | Patrol |
| TC-074 | Search products | P1 | Buyer | Patrol |
| TC-075 | Filter by category | P1 | Buyer | Patrol |
| TC-076 | Variant select + add to cart | P0 | Buyer | Patrol |
| TC-609 | Sale strikethrough price | P1 | Buyer | Patrol |
| TC-608 | Buyer sees seller listing in catalog | P0 | Buyer | Patrol |
| TC-610 | Own products hidden (seller view) | P1 | Seller | Patrol |
| TC-077 | Cart add/update/remove | P0 | Buyer | Patrol |
| TC-078 | **Cart checkbox subset checkout** | P0 | Buyer | Patrol |
| TC-079 | Checkout disabled — zero selected | P1 | Buyer | Patrol |
| TC-080 | Select all / deselect all checkboxes | P2 | Buyer | Patrol |
| TC-081 | Per-seller delivery on cart | P0 | Buyer | Patrol |
| TC-082 | Voucher via route `extra` | P1 | Buyer | Patrol |
| TC-095 | **COD checkout complete flow** | P0 | Buyer | Patrol |
| TC-096 | **Checkout saved card** | P1 | Buyer | Patrol |
| TC-097 | **Checkout new card entry** | P1 | Buyer | Patrol |
| TC-101 | **COD checkout with variant product** | P0 | Buyer | Patrol |
| TC-102 | **Add blocked without variant (Patrol)** | P1 | Buyer | Patrol |
| TC-083 | Multi-seller → 2 orders | P0 | Buyer | Patrol |
| TC-084 | Order history tabs + detail | P1 | Buyer | Patrol |
| TC-085 | Confirm receipt (shipped) | P1 | Buyer | Patrol |
| TC-612 | Invalid login error | P1 | Buyer | Patrol |
| TC-613 | Add blocked without variant | P1 | Buyer | Patrol |
| TC-614 | Qty capped at stock | P1 | Buyer | Patrol |
| TC-086 | **Wishlist add/remove** | P1 | Buyer | Patrol |
| TC-087 | Wishlist clear all | P2 | Buyer | Patrol |
| TC-088 | Follow/unfollow seller profile | P2 | Buyer | Patrol |
| TC-089 | Become seller | P0 | Seller | Patrol |
| TC-090 | **7-step simple product wizard** | P0 | Seller | Patrol |
| TC-091 | **7-step variant product wizard** | P0 | Seller | Patrol |
| TC-615 | Seller views simple product in dashboard (Read) | P1 | Seller | Patrol |
| TC-616 | Seller edits simple product from dashboard (Update) | P1 | Seller | Patrol |
| TC-617 | Seller deletes simple product from dashboard (Delete) | P1 | Seller | Patrol |
| TC-618 | Seller views variant product in dashboard (Read) | P1 | Seller | Patrol |
| TC-619 | Seller edits variant product from dashboard (Update) | P1 | Seller | Patrol |
| TC-620 | Seller deletes variant product from dashboard (Delete) | P1 | Seller | Patrol |
| TC-092 | Seller order status pipeline | P0 | Seller | Patrol |
| TC-093 | Seller voucher CRUD + apply | P1 | Seller | Patrol |
| TC-094 | Preview as buyer (`hideEdit=1`) | P2 | Seller | Patrol |
| TC-611 | Buyer blocked from seller routes | P0 | Buyer | Patrol + API |
| TC-600 | Auth gate vs web guest | P1 | Buyer | Patrol |
| TC-601 | 7-step wizard step count | P2 | Seller | Patrol |
| TC-602 | Checkbox subset parity | P2 | Buyer | Patrol |
| TC-603 | Wishlist in-memory only | P3 | Buyer | Blocked |
| TC-604 | **Notifications bell stub** | P3 | Buyer | Manual |
| TC-605 | **Seller order notification + deep link** | P2 | Seller | Manual / Patrol |
| TC-606 | 6-char password accepted | P2 | Buyer | Patrol |

---

## Parity — Web TCs applicable on mobile (Patrol mirrors)

These web TCs have `Parity: Both` — implement as Patrol where keys exist:

| Area | Web TC IDs | Mobile note |
|------|------------|-------------|
| Auth | TC-001–007 | TC-068 diverges on guest (no TC-008/009) |
| Browse | TC-010–015, TC-065–066 | TC-074–076, TC-608 |
| Cart/checkout | TC-016–029, TC-098–100 | TC-077–097, TC-101–102; TC-078 vs TC-063 |
| Orders/reviews | TC-030–037 | TC-084–085 |
| Seller | TC-041–051 | TC-089–094; no TC-045/052 |
| Security/API | TC-053–056 | TC-611 + shared API tests |

---

## Mobile-only features

| TC ID | Feature | Automation |
|-------|---------|------------|
| TC-078–080 | Cart checkbox selection | Patrol |
| TC-086–087 | In-memory wishlist | Patrol |
| TC-604 | Notifications bell no-op | Manual |
| TC-605 | Local seller order notifications | Manual |
| TC-603 | Wishlist not persisted | Blocked |

---

## Mobile-only gaps (Patrol keys)

Cart, checkout, orders, seller wizard, and wishlist screens lack `ValueKey`s. Flag in `/generate-tests` Phase 1 — add keys per `ui-selectors.md` before full Patrol coverage.

**Total mobile-native scenarios:** 38 (+ shared parity with ~43 web Both TCs)

Full steps and selectors: **`docs/test-cases/test-scenarios.md`**
