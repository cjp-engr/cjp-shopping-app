# Authorize-at-checkout: open items to come back to

Written 2026-10-18. This is the parking lot for the authorize-capture feature (phases 1-4) while other work happens.
Nothing here is urgent to the running app: production stays on `CHECKOUT_FLOW=legacy`.

Related files: spec `docs/superpowers/specs/2026-10-13-authorize-capture-orders-design.md`, plans in `docs/superpowers/plans/` (phase 2: `2026-10-14-...`, phase 3: `2026-10-17-...`; both are gitignored, local only).

## 1. Where things stand

| Phase | What | State |
|---|---|---|
| 1 Foundation | payment operations, leases, webhook inbox, schema, API version pin, seller cancel rule | In the working tree. Not merged or deployed to staging. |
| 2 Manual-capture checkout | checkout sessions, holds, verified placement, web + mobile | Backend, web and mobile done. Playwright web gate 16 passed / 5 failed (paused). Patrol blocked (Gradle loopback error). |
| 3 Acceptance, capture, expiry | seller accept captures exactly the held amount; scanner cancels at 24h; worker resumes crashed captures and releases | All 13 tasks (B1-B8, W1-W2, M1-M3) built, task-reviewed and finally reviewed; manual accept/capture/expiry check passed. **Remaining gate steps in section 2.** |
| 4 Cancellation, refunds, legacy | buyer/seller cancellation, refunds, legacy reconciliation | ChatGPT built much of it (section 3). Not reviewed beyond the buyer-cancellation core. |

Nothing is committed. Everything lives in the working tree on branch `feat/pending-status-buyer-refund`.
Last verified test results (2026-10-18, after ChatGPT's changes): backend 207 unit + 33 contract + 280 integration (2026-10-18, latest), web 126, mobile 201 passed / 5 skipped; `tsc`, `eslint`, `flutter analyze` clean (web and mobile counts from before the final review fixes, which touched backend only).

## 2. Phase 3: what is left

Done (2026-10-18): all 13 tasks, the final whole-branch review (Opus) with its fixes, the full suites, and the manual Stripe check of the seller accept path (14 of 15 checks passed; the one failure, the repeat accept, was fixed afterwards). Details are in section 9. The local SDD workspace and its ledger were deleted; sections 4 and 5 keep the rulings and deferred minors that matter.

What is left of the G1 gate:
1. **Re-run the repeat-accept check live** (the fix is covered by unit tests only): accept an order twice and expect 409 `order_not_pending` the second time.
2. **Read-only Stripe check:** every manual-capture intent is `requires_capture`, `succeeded` (accepted orders only) or `canceled`.
3. **Setup before the gate:** subscribe the Stripe webhook endpoint to `payment_intent.canceled`.
4. **Owner decisions** listed at the end of section 9 (legacy card acceptance, inbox retry cap, COD replica-set requirement, mobile COD deadline notice).

## 3. ChatGPT's changes: my review

Scope of the change set (snapshot diff `0869bf5..40342bb`, 85 files, +2450 / -172): buyer cancellation of pending card orders, legacy card refunds and reconciliation, a Stripe inbox worker, hold-release heartbeat, CI changes, rollout docs, a Playwright spec, and Patrol modules and tests. The diff package is `.superpowers/sdd/2026-10-17-authorize-capture-phase-3/review-CHATGPT-CANCEL.diff`.

**Reviewed and good**
- Manual-capture buyer cancellation reuses the atomic `cancelPendingOrder` claim with an owner filter; replays are no-ops; acceptance winning the race gives `409 cancellation_conflict`; race tests exist.
- Legacy refund job: claim, stock restore and refund operation in one transaction; refunds listed in Stripe before any retry; no re-issue after 23 hours; legacy intents do carry `metadata.userId`.
- Release now runs under a lease heartbeat (closes a gap deferred in phase 3); the Stripe inbox worker retries failed webhook handlers.

**Important (fix before relying on it)** (the COD item below was fixed by the seller-cancellation work, section 8: `cancelOrderAsBuyer` now uses the atomic claim for `not_required` orders)
- COD orders that carry a seller deadline (`paymentStatus: 'not_required'`, `paymentFlowVersion: 'legacy'`) are still cancelled by the old read-then-save path in `backend/src/services/orderService.ts` `cancelOrderAsBuyer`.
  - A buyer cancel racing the deadline scanner restores stock twice.
  - A buyer cancel racing seller acceptance can overwrite `preparing` with `cancelled`.
  - That path does not reverse `soldCount` or the coupon.
  - Smallest fix: route `paymentStatus === 'not_required'` through `cancelPendingOrder` like manual-capture orders, and add concurrency tests (COD cancel vs accept, COD cancel vs scanner, stock/soldCount/coupon restored once).

**Decisions to make**
- Legacy card acceptance now verifies the payment live in Stripe and fails closed with `409 legacy_payment_review` (`orderAcceptance.ts`). The phase 3 plan said legacy acceptance makes no Stripe call. Safer for refunds, but a seller cannot accept a legacy order whose payment does not verify. Keep, or relax for acceptance only?
- Sellers can no longer cancel any card order, legacy included (`sellerService.ts`, plus the web and mobile cancel buttons). This prevents cancelling without a refund, but changes today's seller behavior until seller refunds exist.

**Minor**
- A refund that stays `pending` at Stripe is polled every minute forever, because `attempts` is reset to 0 (`legacyRefund.ts`).
- The buyer's free-text reason replaces the `buyer_cancelled` code in `cancelReason`.
- The new cancellation tests sit before the `beforeAll` hook in the describe block (works, but odd to read).

**Not reviewed:** `docs/*.md` rollout and recovery docs, `.github/workflows/ci.yml`, `backend/scripts/*`, the Playwright spec `local-payment-settlement.spec.ts`, and the Patrol modules/tests. You said automation is yours to do later, so ChatGPT's Patrol and Playwright additions need your own look.

## 4. Rulings I made during phase 3 (so you can overturn any)

- R1 `orderCapture.ts` imports `AcceptanceOutcome` type-only from `orderAcceptance.ts` (type cycle).
- R2 If `runCapture` cannot claim the operation lease, it returns `resolving` instead of failing.
- R3 The COD creation test is an integration test (`orderService.cod.integration.test.ts`).
- R4 No commits; review diffs are between working-tree snapshots.
- R5 Models: sonnet implementers (Opus for B4), Opus reviewers for B4 and B6.
- R6 A cancelled card order with no `paymentIntentId` stays `release_pending` and logs an error.
- R7 The worker repairs `release_pending` orders whose release operation already succeeded.
- R8 `releaseIntentOperation` takes an optional `owner` so the worker can pass a lease it holds.
- R9 (amended) The worker reverts stale `capture_pending` orders that have no non-failed capture operation back to `authorized`.
- R10 The worker creates and runs a release for stale `release_pending` orders that have no release operation.
- R11 A throwing worker handler backs off and reaches `needs_support` after MAX_ATTEMPTS.
- R12 The final review runs on Opus because Fable was out of credits.

## 5. Deferred minor findings from the phase 3 task reviews

Backend
- B1: lost lease (`renewLease` false) is silently ignored in `withLeaseHeartbeat`; noisy heartbeat test; weak `stockRestoredAt` test.
- B2: release needs-support log says `[Checkout]`; concurrency test does not assert `soldCount`/coupon once; no rollback-on-restore-failure test.
- B3: claim filter `paymentIntentId {$exists, $ne ''}` matches an explicit `null`; no test for a past-deadline `capture_pending` order returning `resolving`.
- B4: (409/429 treated as definitive: fixed 2026-10-18, see section 9); a stale `requires_capture` past `authorizationExpiresAt` is treated as a valid hold; capture operations end `succeeded` when nothing was captured; `resumeCapture` does not check the operation's action or intent id; a `processing` response goes straight to `needs_support`; a few test gaps.
- B5: fixed 2026-10-18 (see section 9): a repeat accept of an already-`preparing` order returned an uncoded 400 instead of the documented 409 `order_not_pending`.
- B6: repair queries are unbounded every 15 seconds; sequential Stripe calls in the orphan-release repair; loops log nothing at startup.
- B7: the no-matching-order `succeeded` log lacks an ALERT prefix; swagger webhook descriptions still list only succeeded and payment_failed.
- B8: `(paymentMethod as any).type` could be a shared `isCod`.

Web
- W1: unparseable `acceptBy` gives "Accept within " text; a network failure surfaces as a raw `TypeError`.
- W2: the detail page polling effect can keep a stale `reloadOrder` if the route param changes between two capture-pending orders; no timeout on the in-flight poll flag; footer lacks `flex-wrap` at phone widths.

Mobile
- M1: `OrderEntity` props include `acceptBy` but not `placedAt`/`authorizationExpiresAt`; some test gaps.
- M2: the short-window sentence is a literal in the screen; the widget wiring is not widget-tested.
- M3: a disabled action button lets the tap fall through to the card; "newest request wins" rather than "newest successful"; a few missing tests.

## 6. Operations notes and commands

- **Stripe webhook endpoint must subscribe to `payment_intent.canceled`** (phase 3 webhook handling relies on it). Also keep `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.amount_capturable_updated`.
- Flags: `CHECKOUT_FLOW=legacy|manual_capture`; `SELLER_SEES_MANUAL_CAPTURE=true` only after phase 3 passes its gate. Intervals: `ACCEPTANCE_SCAN_INTERVAL_MS` (default 60000), `OPERATION_WORKER_INTERVAL_MS` (default 15000).
- Ports: 5000 and 5173 are your dev backend and web on the standalone MongoDB (27017, legacy flow only). The manual-capture test stack used 5055 (backend) and 5174 (web) with database `tokomart_manual` on the 27018 replica set; both are currently stopped.
- Run the integration tests only against the replica set, never 27017:
  `cd backend && TEST_MONGODB_URI='mongodb://localhost:27018/tokomart_integration_test?replicaSet=rs0&directConnection=true' npx vitest run --config vitest.integration.config.ts`
- Other suites: `cd backend && npx vitest run && npx tsc --noEmit`; `cd frontend && npx tsc -b && npx eslint . && npx vitest run`; mobile (`D:\donotdelete\flutter\bin` on PATH) `cd frontend-mobile && flutter analyze && flutter test`.
- Restart the manual stack (seeds a fresh database first):
  - `cd backend && MONGODB_URI='mongodb://localhost:27018/tokomart_manual?replicaSet=rs0&directConnection=true' NODE_ENV=development npx tsx src/utils/seed.ts`
  - `cd backend && PORT=5055 NODE_ENV=development CHECKOUT_FLOW=manual_capture SELLER_SEES_MANUAL_CAPTURE=true MONGODB_URI='mongodb://localhost:27018/tokomart_manual?replicaSet=rs0&directConnection=true' npx tsx src/server.ts`
  - `cd frontend && VITE_API_BASE_URL=http://localhost:5055/api VITE_CHECKOUT_FLOW=manual_capture npx vite --port 5174 --strictPort`
- Stripe test cards: success `4242 4242 4242 4242`, declined `4000 0000 0000 0002`, 3DS `4000 0025 0000 3155`.

## 7. Other open items from phase 2 (not phase 3)

- Staging: merge and deploy phase 1, run `npm run migrate:check-intents` on staging, run the Playwright suite against staging with `CHECKOUT_FLOW=manual_capture`.
- Playwright web gate: TC-AUTH-05 (reload path never reaches review) and four product-page `page.goto` timeouts (TC-012, TC-098, TC-105, TC-106) still failing in the last full run.
- Patrol: Android build blocked by the Gradle loopback error (needs a Windows networking change you approve); M4 3DS flow not written.
- Open decisions implemented with defaults: buyer cancellation of manual-capture orders (now enabled by ChatGPT's change), seller visibility of manual-capture orders behind `SELLER_SEES_MANUAL_CAPTURE`.

## 8. Seller pending cancellation (separate feature, 2026-10-18)

Plan `docs/superpowers/plans/2026-10-18-seller-pending-cancellation.md`, spec `docs/superpowers/specs/2026-10-18-seller-pending-cancellation-design.md` (amended for pre-launch scope: no legacy support, no feature flag). Tasks 0 to 5 are done; nothing is committed. Playwright and Patrol were not touched (owner, later).

What it does: a seller cancels their own pending order with a required reason. An authorized card hold is released; a COD order is cancelled with no Stripe request. Everything else returns `409 cancellation_unavailable`. See `payment-recovery.md` for the rules, the `paymentOperation` meaning and monitoring.

Verified on 2026-10-18 on the manual stack (backend 5055, database `tokomart_manual` on 27018, Stripe test mode, published test token `pm_card_visa`), 21 of 21 checks:
- Card order `6ad4ad513ed18d08292d228b`: PaymentIntent `pi_3URsEtJrMKRA89iL1cSWpGYP`, 4918 minor units, authorized with status `requires_capture` and 0 captured. After the seller cancelled with a reason, the response was 200 with `paymentOperation: completed`, the intent was `canceled` with 0 captured, stock and sold count were restored once, a repeat request returned the stored result, and the buyer's order showed `cancelledByRole: seller` with the reason.
- Refusals: no reason gave `400 invalid_cancel_reason`; a seller who does not own the order got `403 not_order_seller`.
- COD order: placed as `not_required` with a 24-hour `acceptBy` and a `sellerId`; the seller cancel returned 200 with no payment outcome, stock was restored, and the 30 most recent PaymentIntents were identical before and after (zero Stripe effect).

Fresh suite results the same day: backend 204 unit, 33 contract and 274 integration tests plus a clean build; web 126 tests with clean type-check and lint; mobile 201 passed and 5 skipped with a clean `flutter analyze`.

Found while verifying: the web seller adapter used to drop `paymentStatus`, `acceptBy`, `paymentFlowVersion` and `cancelReason`, so the phase 3 seller screens never saw them. Fixed in the same work and covered by a test. Still open: the owner's manual check of the web and mobile screens, and the Playwright and Patrol coverage.

## 9. Phase 3 final review (2026-10-18)

The final whole-branch review ran on Opus (ruling R12). The local SDD workspace (`.superpowers/sdd/2026-10-17-authorize-capture-phase-3/`, with the ledger and review diffs) has been deleted, so the references to it in sections 2 to 5 are historical. The deferred minors in section 5 are the final list: the review triaged all of them as "can wait" except B4 (409/429) and B6 (the orphan-repair race), both fixed below, and the B5 repeat accept, also fixed below.

Verdict: ready for the manual/staging gate; no Critical findings. Three Important findings were fixed (uncommitted):
- COD orders placed under the default flow version skipped the `acceptBy` check at accept time; COD is now recognised by `paymentStatus: not_required`.
- The orphaned-capture repair could revert an order a stalled accept request later captured; the repair now claims the next-generation capture key as a failed `orphan_reverted` marker first.
- A Stripe 409/429 on capture is now treated as ambiguous and deferred to the worker instead of rejecting the capture.

Also fixed (B5): a seller's request to move any order to `preparing` now always goes through `acceptOrder`, so a repeat or late accept returns 409 `order_not_pending` instead of an uncoded 400 (`sellerService.ts`; test in `sellerTransitions.test.ts`).

Manual Stripe check of the seller accept path (2026-10-18, manual stack on 5055 / `tokomart_manual`, test mode, run before the B5 fix): 14 of 15 checks passed. Accept captured exactly the held amount (4918 of 4918); another seller got 403 and Stripe stayed uncaptured; two simultaneous accepts captured once; a late accept got 409 `acceptance_deadline_passed`; the scanner cancelled the order as `system`, the PaymentIntent went to `canceled` with nothing captured and stock was restored once; COD accept worked. The one failure was the B5 repeat accept, since fixed (not re-run live).

Backend after the fixes: 207 unit, 33 contract and 280 integration tests, clean type-check.

Needs an owner decision or setup (not changed):
- The Stripe webhook endpoint must subscribe to `payment_intent.canceled`.
- COD cancellation (buyer or seller) and the deadline scanner now use transactions, so every stack, including the dev stack on 5000/5173, needs a replica set.
- Legacy card acceptance now calls Stripe and fails closed; card orders without an intent can never be accepted or buyer-cancelled, and web/mobile show no specific message for `legacy_payment_review`.
- The Stripe inbox worker retries failed events forever (no attempt cap or dead-letter state); a legacy amount mismatch can trigger that.
- The mobile buyer notice hides the 24-hour deadline for non-manual-capture orders, so COD buyers are not told about it.
- Minor: `cancelReason` holds free text instead of the reason code; the old seller `preparing → processing` path still checks product ownership.
