# TokoMart Test Scenarios — Master Index

> **Scope:** Web (`frontend/` — React) + Mobile (`frontend-mobile/` — Flutter) + API (`backend/`).  
> Web-only TCs: TC-008–009, TC-038, TC-045, TC-052, TC-059–060. Mobile-only TCs: TC-086–087, TC-604–605. Divergent behaviour: TC-141 (web) vs TC-174 (mobile) on deleting a saved address.  
> **Last reviewed:** 2026-10-24 against branch `main` at `2251348` (code reading only; no tests were run for this update).

## Platform Files

| Platform | File | Coverage |
|----------|------|----------|
| Web | [test-scenarios-web.md](test-scenarios-web.md) | TC-001–025, TC-029–032, TC-034, TC-037–047, TC-049–052, TC-055, TC-059–066, TC-098–100, TC-105–106, TC-109, TC-112, TC-120–131, **TC-137–171** |
| API | [test-scenarios-api.md](test-scenarios-api.md) | TC-026–028, TC-033, TC-035–036, TC-048, TC-053–054, TC-056–058, TC-107–108, TC-110–111, TC-113–119, TC-132–136, **TC-190–231** |
| Mobile | [test-scenarios-mobile.md](test-scenarios-mobile.md) | TC-067–097, TC-101–104, TC-600–624, **TC-172–189** |

---

## P0 Smoke Block

| # | Platform | Flow | Automation |
|---|----------|------|------------|
| S1 | Web | Login → add to cart → checkout COD → order appears in history | Playwright — TC-001, TC-016, TC-022, TC-098 |
| S2 | Mobile | Login → browse → cart visible | Patrol — TC-067, TC-072, TC-073 |
| S3 | Both | Become seller → create simple product → create variant product | Web: TC-041, TC-042, TC-064 · Mobile: TC-089, TC-090, TC-091 |
| S4 | Both | Cart with items from 2 sellers → checkout → 2 separate orders in history | Web: TC-021, TC-025 · Mobile: TC-083 |
| S5 | Both | Card checkout reserves the amount → seller accepts → payment captured | Web: TC-143, TC-155 · Mobile: TC-176, TC-182 · API: TC-199 |
| S6 | Both | Pending order cancelled by the buyer, and by the seller with a reason; hold released | Web: TC-152, TC-157 · Mobile: TC-180, TC-183 · API: TC-205, TC-209 |
| S7 | Both | Delivered order → buyer requests a refund → seller approves → refund settles | Web: TC-162, TC-164 · Mobile: TC-185, TC-186 · API: TC-223 |

S5–S7 need the environment flags below.

---

## Environment flags for the 2026-10 features

| Flag | Where | Needed by | Notes |
|------|-------|-----------|-------|
| `CHECKOUT_FLOW=manual_capture` | backend (`legacy` is the default) | TC-143–148, TC-152, TC-155, TC-176–183, TC-193–204 | Card checkout becomes authorize-then-capture. With `legacy` the old flow applies and `POST /api/orders` takes cards. |
| `VITE_CHECKOUT_FLOW=manual_capture` | web build | all web card-checkout TCs | Must match the backend. |
| `SELLER_SEES_MANUAL_CAPTURE=true` | backend | seller TCs on card orders (TC-155–160, TC-182–184, TC-199–201, TC-209–213) | When `false`, sellers cannot see manual-capture orders (TC-231). |
| `DELIVERED_REFUNDS_ENABLED=true` | backend | TC-161–170, TC-185–187, TC-214–227 | `false` disables new requests and decisions but reads stay available (TC-219). |
| `ACCEPTANCE_SCAN_INTERVAL_MS`, `OPERATION_WORKER_INTERVAL_MS` | backend | TC-203 and recovery checks | Lower them to shorten waits. |
| MongoDB replica set + Stripe test mode | environment | all of the above | Never use the standalone 27017 database. Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (declined), `4000 0025 0000 3155` (3DS). |

---

## Summary

Counts below are recomputed from the `### TC-` headings in the platform files on 2026-10-24. The earlier table said 152; it had drifted.

| Range | Count | Focus |
|-------|-------|-------|
| TC-001–066 | 66 | Buyer auth, browse, cart, checkout, orders, reviews, UI; seller orders, vouchers, wizard; security and edge (web + API) |
| TC-098–100, TC-105–136 | 35 | Variant checkout, rate limiting, isolation, security, pagination, seller variant CRUD |
| TC-067–097, TC-101–104 | 35 | Mobile happy path — auth, browse, cart, checkout, orders, wishlist, seller |
| TC-600–624 | 25 | Mobile session, UI, negative, edge, parity, seller CRUD, infinite scroll |
| **TC-137–142** | 6 | **New** Saved addresses and saved cards (web) |
| **TC-143–151** | 9 | **New** Authorize-at-checkout (web) |
| **TC-152–154** | 3 | **New** Buyer cancels a pending order (web) |
| **TC-155–160** | 6 | **New** Seller acceptance and cancellation (web) |
| **TC-161–170** | 10 | **New** Delivered-item refunds (web) |
| **TC-171** | 1 | **New** Offline banner (web) |
| **TC-172–175** | 4 | **New** Saved addresses and payment methods (mobile) |
| **TC-176–179, TC-189** | 5 | **New** Authorize-at-checkout (mobile) |
| **TC-180–184** | 5 | **New** Cancellation and seller acceptance (mobile) |
| **TC-185–187** | 3 | **New** Delivered-item refunds (mobile) |
| **TC-188** | 1 | **New** Offline banner (mobile) |
| **TC-190–192** | 3 | **New** Saved addresses and cards (API) |
| **TC-193–198, TC-231** | 7 | **New** Authorize-at-checkout, 426 guards, drafts (API) |
| **TC-199–204** | 6 | **New** Seller accept, deadline and expiry (API) |
| **TC-205–213** | 9 | **New** Buyer and seller cancellation (API) |
| **TC-214–227** | 14 | **New** Delivered-item refunds, delivery timestamps (API) |
| **TC-228–230** | 3 | **New** API docs, webhook signature, payment events (API) |
| **Total** | **256** | Web 108 · Mobile 78 · API 70 (95 added on 2026-10-24) |

**Automation split of the new TCs (95):** Playwright / Playwright-API 71, Patrol 15 (the refund and several checkout screens still need widget keys), Manual 6, Blocked 3 (TC-202, TC-204, TC-230 need clock control, concurrency or signed Stripe events). The owner writes the automation (AGENTS.md rule 1); nothing under `e2e-testing/` or `patrol_test/` was changed.

---

## Existing scenarios corrected in this update

| TC | What changed | Why |
|----|--------------|-----|
| TC-022 | COD always uses `POST /api/orders`, carries `not_required` + 24 h `acceptBy` | COD now follows the seller acceptance deadline |
| TC-023, TC-024, TC-096, TC-097 | Result depends on `CHECKOUT_FLOW`; under `manual_capture` cards are authorized, not charged | Authorize-capture checkout |
| TC-030, TC-084 | Order tabs now include **Return/Refund** (web also has **All**); Complete hides fully refunded orders | Delivered-item refunds |
| TC-032 | Buyer cancel is pending-only, with a confirm dialog and optional reason | PR #80, #81; authorize-capture |
| TC-033 | Pending-only rule; 409 `cancellation_conflict` for manual-capture/COD orders | Was "pending/preparing" |
| TC-047, TC-092 | `pending → preparing` is the acceptance step ("Accept & start preparing") | Authorize-capture |
| TC-048 | `shipped → cancelled` is no longer allowed; repeat accept is 409 `order_not_pending` | Authorize-capture |
| TC-049 | Seller cancel split: pending needs a reason (1–1000) and the server flag; later states COD only | Seller pending cancellation |
| TC-085 | Endpoint corrected to `PUT /api/orders/:id/confirm-received` | Was `PATCH …/confirm` |

---

## Domain doc gaps (code ≠ `tokomart-domain`; docs were not edited)

Found while reviewing on 2026-10-24. The domain files were last edited on 2026-08-17.

1. **Buyer cancel** (`business-rules.md` §5): says `pending` or `preparing`; code allows `pending` only.
2. **Seller transitions** (§5): `shipped → cancelled` is listed; `VALID_TRANSITIONS` now allows only `shipped → delivered`. The line "any of pending…shipped can → cancelled" is stale.
3. **Payments** (§4): no Stripe, no `paymentStatus` enum (`awaiting_authorization`, `authorized`, `capture_pending`, `captured`, `release_pending`, `released`, `refund_pending`, `refunded`, `partially_refunded`, `failed`, `not_required`), no `/api/checkout/sessions`, no 426 `update_required` guard, no `awaiting_payment` draft status.
4. **Acceptance window** (§5): not documented — 24 h `acceptBy` (or the card's earlier deadline minus 5 minutes), auto-cancel with `seller_acceptance_timeout`, `cancelledByRole`/`cancelledById`/`cancelledAt`.
5. **Delivered-item refunds**: absent — `deliveredAt`, `refundRequestDeadlineAt` (+168 h), `RefundRequest` states `requested`, `rejected`, `processing`, `refunded`, `needs_review`, reason codes, the `refund-*` endpoints.
6. **Order tabs** (§5): mobile table lacks Return/Refund; web has All and Return/Refund tabs.
7. **Profile** (§8): saved-address edit (`PUT /saved-addresses/:id`), save-at-checkout, default card endpoint (`PATCH /payment-methods/:id/default`) and the mobile `/payment-methods` route are missing.
8. **API reference**: the new checkout, refund, seller-decision, saved-address and payment-method endpoints, `/api-docs` and `/api-docs.json` (non-production), and the error codes `cancellation_conflict`, `cancellation_unavailable`, `invalid_cancel_reason`, `not_order_seller`, `order_not_pending`, `acceptance_deadline_passed`, `refund_validation`, `refund_conflict`, `refund_not_found`, `delivered_refunds_disabled`, `legacy_payment_review` are not listed.
9. **Coupons** (§13): "usage is not rolled back on cancel" looks stale — the cancellation work restores reserved coupon use once. Verify before relying on either.
10. **Stock restore** (§5, §13): pending cancellations are variant-aware for buyer and seller; the seller `preparing`/`processing` COD cancel path still restores product-level stock only (the old limitation remains there).
11. **Credentials**: `SKILL.md` lists `test@example.com` / `password123`; `business-rules.md` lists `hello@world.com` / `Test750!!` and `seller@test.com`; existing TC-001 uses the first. Pick one source of truth. (Secrets are not reproduced here.)
12. **Wizard steps** (§2): says 6 steps for web and mobile; mobile has 7 (see TC-601). `SKILL.md` still says Playwright is "not yet in repo".

### Known gaps worth a decision (from `docs/authorize-capture-open-items.md` and code reading)

- Seller cancellation spec says "preparing or later → 409 `cancellation_conflict`"; code allows COD cancellation in `preparing`/`processing` and answers `cancellation_unavailable` for card orders (TC-160, TC-211).
- No client shows a specific message for `legacy_payment_review`.
- The Stripe event inbox retries failed events without a cap.
- The mobile buyer notice hides the 24-hour acceptance deadline for COD orders; web hides it for any non-manual-capture order (TC-179).
- `cancelReason` holds free text instead of a reason code for buyer cancellations.
- Web Profile deletes a saved address without a confirmation dialog while mobile confirms (TC-141, TC-174).

---

## Downstream

| Skill | Input |
|-------|-------|
| `/test-strategy` | this file and the platform files |
| `/generate-tests` | master + filtered views; `ui-selectors.md` for keys (needs the new selectors added by the owner) |
| `/review-tests` | scenarios as acceptance criteria |
