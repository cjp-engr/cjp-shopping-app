# Delivered-item refunds: handoff note

Written 2026-10-18 (updated at the end of each work session). For whoever continues this feature (Claude, ChatGPT, or the owner).

## Current continuation status — 2026-10-18

Shipping policy amendment: implemented after the baseline evidence below. Full
seller-fault refunds include original shipping once; partial selections and `other`
exclude it. Separate requests include shipping with the final paid unit only when
all earlier confirmed requests also establish seller fault. Change of mind is
pending-only, and cannot be submitted for delivered orders. Existing quotes lacking
shippingMinor stay item-only. Backend reserves/settles shipping separately; web and
mobile show shipping in quotes/history. Updated manual script writes a separate
shipping evidence file; the earlier Stripe run below verified the prior policy,
not this amendment. Current amendment test evidence is in the execution ledger.

Tasks 3–6 are now implemented in the working tree, and Task 7 documentation and
manual Stripe test-mode service verification are complete. The earlier foundation
notes below are retained as history; their "next"/"not started" statements no
longer describe the current code. Do not recreate those services.

- Request API: buyer eligibility/history/create; seller paginated list and
  approve/reject. Strict body validation, safe public views, buyer/key replay,
  single active request, conditional ownership and transactional approval claims.
- Settlement: dedicated delivered refund executor and purpose routing, immediate
  post-approval attempt, stable metadata/keys, atomic aggregates and operation
  completion. Pending, ambiguous and permanent provider outcomes remain distinct.
  Legacy cancellation refunds remain routed to their existing handler.
- Recovery: provider read outages before creation retry safely; ambiguous creates
  reconcile by metadata rather than a replacement key. Scheduled review polling
  avoids oldest-batch starvation. Durable refund events converge with polling;
  delayed payment-success events do not overwrite partially refunded status.
- Web: delivered order item selection/reason/history; seller requests in the
  dashboard Orders tab; detail links to that review area; confirmation before
  approval; server-derived capability flags; partial notices and net revenue.
- Mobile: existing authenticated Dio via RefundApi, RefundBloc, buyer order panel,
  seller refund screen via the dashboard refund icon, model and revenue updates.
  Unit/BLoC/widget tests cover forms, approval confirmation, required rejection
  explanation, exact quotes and safe submission retry.
- Review: two independent reviews found important race/recovery issues, all
  reproduced failing then fixed with regression tests. See execution ledger
  `docs/delivered-refunds-progress.md` for decisions and evidence.

Final verification actually run in this continuation:

- Backend: 256 unit, 33 contract, 393 replica-set integration tests passed;
  `npx tsc --noEmit` clean. Integration used only port27018 `_test` databases.
- Web: 132 unit tests, full ESLint, TypeScript and production build passed.
- Mobile: 209 tests passed, 5 pre-existing legacy-flow skips; Dart analysis clean.
- Manual actual Stripe TEST-mode check: authorization -> seller capture ->
  shipping/receipt -> two approved selected-unit refunds. Captured2660,
  refunded1080+1080, retained shipping500, fulfillment delivered, inventory/sold
  unchanged. No real funds, no existing user orders changed. IDs and reproduction
  command are in `docs/local-payment-verification.md`.
- No Playwright/Patrol files changed or tests run, per AGENTS.md. No commits,
  pushes, branch changes, deployments, owner process restarts, or port27017 use.

Remaining release work belongs to the owner: manual browser/mobile UI acceptance
or owner-authored automation, hosted verification and installed-client compatibility,
then explicit enablement of DELIVERED_REFUNDS_ENABLED. It remains off by default;
this continuation did not edit the owner's environment files or enable hosted flags.
Do not confuse mocked tests or backend Stripe verification with full UI acceptance.

## Historical foundation handoff (superseded where noted above)

- Spec (approved): `docs/superpowers/specs/2026-10-18-delivered-item-refund-design.md`
- Plan: `docs/superpowers/plans/2026-10-18-delivered-item-refunds.md` (local, gitignored; do not edit it)
- Branch: `feat/delivered-item-refund`. **All work below is uncommitted in the working tree.** Do not commit, push or change branches unless the owner asks.
- Read `AGENTS.md` first. Its hard rules are binding. The ones that matter most here:
  - **Do not touch Playwright or Patrol** (`e2e-testing/`, `frontend-mobile/patrol_test/`). The plan has Playwright and Patrol steps in Task 5 and Task 6 (the `e2e-testing/tests/web/buyer/delivered-item-refunds.spec.ts` file, the `patrol_test/2_buyer/delivered_item_refunds_test.dart` file, and the "run Playwright/Patrol" bullets). **Skip all of them** and say so in the final message. Do not gate checkpoints on e2e runs; use unit, widget and integration tests plus a manual Stripe test-mode check instead.
  - Ignore every "Checkpoint: feat: ..." commit step in the plan (no commits without the owner's say-so).
  - Never use MongoDB port 27017. Integration tests run only on the `_test` database on port 27018.
  - Stripe test mode only. Never print secrets. Change only files in the repo.

## Later update (2026-10-18, Claude): read `docs/delivered-refunds-progress.md` for the current state

ChatGPT continued after the "Done" section below was written. Its ledger (`docs/delivered-refunds-progress.md`) records Tasks 3 to 6 as implemented and the seller-fault shipping refund amendment. The "To do" list below is therefore **out of date**; use the ledger. What remains is the owner's web and mobile UI acceptance, old-client compatibility checks, an actual Stripe check of the shipping refund, and explicit feature enablement.

Changes made after that, by Claude, at the owner's request (all uncommitted):
- **Return/Refund tab rule:** a request still waiting for the seller (`requested`) stays with the order under Completed; once the seller approves it, it moves to Return/Refund (`processing`, `needs_review`, `refunded`). Rejected requests do not appear in the tab. Backend: `listCompletedBuyerRefundRequests` now filters on those three states (route `GET /api/orders/refund-requests/completed` and the method name are kept for compatibility; swagger text updated). Web: `CompletedRefunds.tsx`, `utils/refund.ts` (`approvedRefundStates`, caption helpers), `RefundPresentation.tsx`. Mobile: `completed_refunds.dart`, `refund_request_card.dart`, `refund_models.dart` (`approvedBySeller`, `amountCaption`, `decidedAt`). Card captions now read "Refund approved" and "Approved <date>" for approved-but-unfinished refunds.
- **Return/Refund tab card (web), 2026-10-18:** each refund is now an order-style card (`components/orders/RefundOrderCard.tsx`): store name and status badge, order number and order date, one row per refunded line (image, name, `xN`, reason, amount, each-price when all units match), a total bar with the shipping included, a status banner, and View Details plus an expandable Refund details section. `CompletedRefunds.tsx` renders a single column of these. To support it, the buyer list (`listCompletedBuyerRefundRequests`) now also returns `sellerName` (null if the account is gone) and `orderPlacedAt`; both are documented as optional in `config/refundSchemas.ts`. The order number now uses the same first-8-characters form as My Orders. **Mobile has not been restyled yet** (it still uses `RefundRequestCard`); the same card layout is the next step there. Tests: backend 259 unit, 33 contract, 405 integration; web 144; `frontend/src/refund-ui-preview.tsx` fixtures were extended with `sellerName` and `orderPlacedAt` and a processing example.
- **Seller Return/Refund tab (web), 2026-10-18:** the seller's Orders tab (`pages/SellerDashboard.tsx`) now has a **Return/Refund** filter pill (with the request count) next to All, Pending, ... Cancelled. The always-visible "Refund requests" panel above the order list is gone; selecting the pill shows `RefundRequestReview`, which now renders the same order-style card as the buyer's tab (`RefundOrderCard` with `viewer="seller"`): buyer name and status, order number and date, items, total bar, a banner per state (awaiting your decision, processing, refunded, needs review, rejected with its reason), the Reject and Approve controls inside the card, a left status accent, View Details to `/seller/orders/:id`, and an expandable Refund details section. All states appear in the seller tab (a seller must see requests awaiting a decision), unlike the buyer tab. The pill count comes from `refundService.sellerList(1).total` and refreshes after a decision. Backend: the seller list now also returns `buyerName` (null if the account is gone) and `orderPlacedAt` (documented as optional in `config/refundSchemas.ts`). Tests after this: backend 259 unit, 33 contract, 406 integration; web 148. **Not verified in the real dashboard:** I could not sign in to the manual stack (the seeded `x@x.com` login was rejected, so the database was probably reseeded with other credentials), so the pill and wiring were checked by type-check, tests and the fixture preview only; please click through it. Mobile was restyled afterwards (see the next entry).
- **Mobile Return/Refund restyle, 2026-10-18:** new `frontend-mobile/lib/features/refunds/presentation/refund_order_card.dart` (`RefundOrderCard`, `RefundViewer.buyer|seller`) mirrors the web order-style card and the My Orders card: avatar, name and status pill, `Order #... · date` strip, one row per refunded line (image or placeholder, name, `xN · reason`, amount, each-price when all units match), total bar with shipping, a status banner per state and viewer, an optional decision area, View Details (buyer only, via `onViewOrder`) and an expandable Refund details section; the action buttons wrap at large text sizes. Buyer tab (`completed_refunds.dart`) uses it. Seller side: the separate "Refund requests" screen and its app-bar icon are gone; `refund_review_panel.dart` now exposes `RefundReviewList` (same Approve, confirm dialog, Reject-with-reason flow and labels as before), shown in the Orders tab behind a **Return/Refund** chip with the request count (`seller_dashboard_screen.dart`, `_loadRefundTotal` via `RefundApi.sellerList(1)`; it fails quietly and hides the chip when the API is missing or errors). `RefundRequestData` gained `sellerName`, `buyerName`, `orderPlacedAt`, `decidedAt`, `approvedBySeller`, `amountCaption`. The old `RefundRequestCard` is still used for the history list inside the buyer's refund request panel. Tests: new `refund_order_card_test.dart` (9, including 2x text with long names, which caught and fixed an action-row overflow) and `seller_dashboard_refund_chip_test.dart` (4); suite 226 passed, 5 skipped; `flutter analyze` clean. **Not checked on a device or emulator** (widget tests only), so please look at it on a phone.
- **Order link contrast (web):** shared `refundOrderLink` style in `RefundPresentation.tsx` (the old 12px brand orange was 3.8:1).
- Tests after these changes: backend 259 unit, 33 contract, 404 integration; web 138; mobile 213 passed and 5 skipped; `tsc` and `flutter analyze` clean.
- Known lint item that is not part of this work: `frontend/src/refund-ui-preview.tsx` (ChatGPT's temporary visual harness, with `frontend/refund-ui-preview.html`) fails ESLint's `react-refresh/only-export-components`. Delete both files, or exclude them from lint, before committing.
- The visible copy of the empty state and tab subtitle changed (for example "No approved refunds yet"). The owner's future Playwright and Patrol tests should be written against the current text.

## Test commands (from the repo root)

```bash
cd backend && npx tsc --noEmit && npx vitest run                      # unit
cd backend && npm run test:contracts                                   # swagger / contract
cd backend && TEST_MONGODB_URI='mongodb://localhost:27018/tokomart_integration_test?replicaSet=rs0&directConnection=true' npx vitest run --config vitest.integration.config.ts   # integration
```

Last full run (after the Task 3 foundation): 250 unit, 33 contract, 341 integration, `tsc` clean. Web and mobile were not touched yet.

## Done

### Task 1: trustworthy delivery timestamps (done, tested, not separately reviewed)
- New `backend/src/services/orderDelivery.ts`: `markOrderDelivered(orderId, 'shipped', deliveredAt, actor)` (one conditional update; sets `deliveredAt` and `refundRequestDeadlineAt` = delivery + 168h, only if `deliveredAt` does not exist yet) and `autoDeliverShippedOrders(now)` (pipeline update using each order's own `shippedAt + 48h`, so downtime cannot extend a window).
- Wired into all three paths: `orderService.confirmOrderReceived` (buyer), `sellerService.updateSellerOrderStatus` (`delivered`), `jobs/autoCompleteOrders.ts`.
- `Order` has new `deliveredAt`, `refundRequestDeadlineAt`. Immutability comes from the update filter, not the Mongoose `immutable` flag (that would block the update itself). No backfill: old delivered orders without timestamps stay "unknown" and are ineligible.
- Tests: `orderDelivery.integration.test.ts` (22), extended `jobs/__tests__/autoCompleteOrders.test.ts`.

### Task 2: allocation and eligibility (done, Opus-reviewed, review fixes applied)
- `backend/src/services/refundAllocation.ts`: `buildRefundAllocation(order)` builds a `RefundAllocationV1` (per-unit `merchandiseMinor` and `taxMinor`, `shippingMinor`, `capturedAmountMinor`) from the order's persisted snapshot only (no product lookup). Captured total is apportioned over merchandise, tax and shipping, then over lines by net value, then over units, all with BigInt largest-remainder (ties go to the lower line or ordinal). Also exports `availableUnits`, `refundableUnits` (skips zero-value units), `isConsistentAllocation`, `lineIdFor` (historical items without a stored `_id` get `line-<index>`), `RefundAllocationError`.
- `backend/src/services/refundEligibility.ts`: `getRefundEligibility(orderId, buyerId, now?)` returns `{ eligible, reason?, currency, deliveredAt, deadlineAt, lines: [{ lineId, productName, quantityOrdered, quantityAvailable, availableUnitAmountsMinor }] }`. Reasons: `not_delivered`, `delivery_unknown`, `window_closed`, `unsupported_payment`, `payment_not_refundable`, `seller_unverified`, `active_request`, `no_units_left`, `review_needed`. Foreign or unknown orders give 404 `order_not_found`. `ensureRefundAllocation(order, session?)` stores the allocation lazily on first use with a compare-and-set (replaces a `null`), and re-validates a stored one on every read.
- New `Order` fields (read by Task 2, to be written by Task 3 and Task 4): `refundAllocation`, `activeRefundRequestId`, `refundedAmountMinor`, `refundReservedAmountMinor`, `refundUnitsTaken: [{ lineId, ordinal }]`.
- **Invariant eligibility enforces** (keep it true when writing Task 3 and Task 4): `sum(value of refundUnitsTaken) === refundedAmountMinor + refundReservedAmountMinor`. A request's amount is exactly the sum of its selected units' `merchandiseMinor + taxMinor`. Units taken by a rejected request must be released again.
- Eligibility already accepts `paymentStatus` `captured` and `partially_refunded` (as a plain string). The `partially_refunded` enum value is now in `PAYMENT_STATUSES` (added with the Task 3 foundation).
- Decisions to keep: allocation stored lazily (not at capture time, to leave the reviewed capture path alone); parts-vs-captured tolerance is 1 minor unit (spec: do not reject over a one-cent rounding difference); shipping is apportioned with the rest (spec wording), which in about 1 of 200,000 orders makes shipping one cent off.
- Review notes for Task 3: call `ensureRefundAllocation` before opening the transaction, or pass the session. Reject requests whose selected units add up to zero. Manual-capture orders are hidden from sellers unless `SELLER_SEES_MANUAL_CAPTURE=true`, so the seller side must cope with that.
- Tests: `refundAllocation.test.ts` (42, incl. a seeded 400-order invariant test), `refundEligibility.integration.test.ts` (39).

## Original next steps (now implemented; historical reference only)

### Task 3: request, approve and reject API (next; see plan Task 3 and spec "API and concurrency")
Status: **foundation done (2026-10-18), service and API not started.** Already in place and green (250 unit, 33 contract, 341 integration, `tsc` clean):
- `PAYMENT_STATUSES` in `models/Order.ts` and the swagger `paymentStatus` enum now include `partially_refunded`.
- `models/PaymentOperation.ts` has optional `refundPurpose` (`'delivered_items'`, exported `REFUND_PURPOSES`), `refundRequestId`, `amountMinor`, `currency`.
- `config/checkout.ts` exports `deliveredRefundsEnabled()` (reads `DELIVERED_REFUNDS_ENABLED`, default off); `.env.example` documents it.
- New `models/RefundRequest.ts`: fields `orderId`, `buyerId`, `sellerId`, `units` (selected units with quoted amounts), `amountMinor`, `currency`, `allocationVersion`, `reasonCode`, `description`, `idempotencyKey`, `payloadHash`, `state`, `submittedAt`, decision and error fields. Database indexes: unique `(buyerId, idempotencyKey)`, and a unique partial index on `orderId` for states `requested | processing | needs_review` (the one-unresolved-request-per-order guard).
Still to do, in this order: (1) `services/refundRequestService.ts` (create, decide, list buyer, list seller; use `getRefundEligibility` / `ensureRefundAllocation` / `refundableUnits`, compute `payloadHash` from the sorted selection plus reason plus description), (2) `validators/refundValidators.ts`, (3) `controllers/refundRequestController.ts` and routes in `orderRoutes.ts` / `sellerRoutes.ts`, (4) swagger paths, schemas and error codes (the drift test needs them), (5) `services/__tests__/refundRequest.integration.test.ts` written first, (6) all suites, then a short Opus review of the approval transaction.
Files to create (remaining): `models/RefundRequest.ts`, `services/refundRequestService.ts`, `controllers/refundRequestController.ts`, `validators/refundValidators.ts`, `services/__tests__/refundRequest.integration.test.ts`. Files to modify: `routes/orderRoutes.ts`, `routes/sellerRoutes.ts`, `config/swagger.ts`, `config/swaggerSchemas.ts` (the swagger drift test requires every route, error code and schema to be documented).
Key rules from the spec and plan:
- Endpoints: `GET /api/orders/:id/refund-eligibility`, `GET/POST /api/orders/:id/refund-requests`, `GET /api/seller/refund-requests` (paginated, default page 1, limit 20, max 100), `PUT /api/seller/refund-requests/:id/decision`. Responses `{ success: true, ... }`; create 201, idempotent replay 200, approve 202, reject 200; 409 for state or balance conflicts, 400 for validation, 404 for missing or foreign (do not disclose). Error envelope is `{ success, message, code }`.
- Create: buyer-scoped idempotency (key max 128 chars; same key and payload returns the original; changed payload is a conflict), reason code (`damaged`, `wrong_item`, `missing_items`, `not_as_described`, `other`), description trimmed 1 to 1000, reject duplicate or foreign line ids, quantities must be positive integers within what is available, reject client-supplied amount or currency, reject zero-value selections. Snapshot the quote (unit ordinals and amount) on the request. Claim the order's single active request with a conditional update (or a transactionally guarded claim); also a database-enforced unique buyer and key.
- Decide (seller, by persisted `sellerId`): `approve` or `reject` (rejection reason required, 1 to 1000). Approval transaction: claim `requested` state, revalidate the quote against the stored allocation and balance, reserve units and amount (`refundUnitsTaken`, `refundReservedAmountMinor`), insert the durable `PaymentOperation` (`action: 'refund'`, key `refund-request:<requestId>:refund:1`, purpose `delivered_items`) before any Stripe call. Never call Stripe inside a transaction. Approval vs rejection has exactly one winner; a repeat approval returns the current outcome. Rejection releases the active claim; `processing` and `needs_review` keep it. A timely request stays decidable after the deadline.
- `DELIVERED_REFUNDS_ENABLED=false` blocks new requests and decisions but leaves reads available.
- Request states: `requested | rejected | processing | refunded | needs_review`. The view must never serialize leases, provider secrets or idempotency internals.
- Tests to write first (integration, replica set): own create and history, foreign buyer or seller, same-key replay, changed payload conflict, duplicate or foreign line ids, zero, fractional and oversize quantities, invalid reason, concurrent create, rejection without reason, approve vs reject race, repeated approve, exactly one durable operation, inventory, coupon and sold counters unchanged, disabled flag.
- Then run unit, contract and integration suites and `tsc`.
- Suggested next step after writing it: a short Opus review focused on the approval transaction and the concurrency claims.

### Task 4: settlement and recovery (plan Task 4)
New `services/deliveredRefund.ts` (`resumeDeliveredRefund`, `reconcileDeliveredRefund`); route refund operations by `refundPurpose` in `paymentOperationWorker.ts` (operations without a purpose keep going to `resumeLegacyRefund`; an unknown purpose fails closed); `stripeService.ts` helpers; webhook inbox reconciliation. Unknown outcome after a Stripe create must be reconciled, never retried with a new key. On success, in one atomic update: request `refunded`, reserved amount down, refunded amount up, units stay taken, active claim cleared; `paymentStatus` becomes `partially_refunded` unless the confirmed refunded total equals the full captured amount. Never restore stock or coupons. Pending provider refund stays `processing`; failed or uncertain becomes `needs_review` and keeps the reservation.

### Task 5: web (plan Task 5; **skip the Playwright spec and its run**)
`frontend/src/types/refund.ts`, `services/refundService.ts` (+ test), `components/orders/RefundRequestPanel.tsx`, `components/seller/RefundRequestReview.tsx`, changes to `OrderDetail.tsx`, `SellerOrderDetail.tsx`, `SellerDashboard.tsx`, `types/order.ts`, `utils/orderPayment.ts`; revenue must subtract confirmed refunded amounts only (fixture: 2160 - 500 = 1660).

### Task 6: mobile (plan Task 6; **skip the Patrol test and its run**)
`frontend-mobile/lib/features/refunds/...` (the app uses BLoC, e.g. `SellerBloc`; follow that convention instead of adding a different pattern if practical), model and bloc/cubit tests, buyer and seller panels, notice and badge updates. Run `flutter analyze` and `flutter test` (Flutter is at `D:\donotdelete\flutter\bin`; add to `PATH` for the command only).

### Task 7: rollout docs
Update `docs/payment-rollout.md`, `docs/payment-recovery.md`, `docs/local-payment-verification.md`. Check that older deployed clients handle `partially_refunded` before enabling. Record a Stripe test-mode check of two selected-quantity refunds on one payment (use fresh fixtures, never edit real user orders).

## Known open items from earlier work (not part of this feature)
See `docs/authorize-capture-open-items.md` (section 9 lists the owner decisions: legacy card acceptance, Stripe inbox retry cap, COD replica-set requirement, mobile COD deadline notice).
