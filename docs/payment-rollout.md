# Manual-capture payment rollout

## Delivered-item refunds (2026-10-18)

This is a separate feature behind `DELIVERED_REFUNDS_ENABLED=false`. Recording
delivery timestamps and compatible response fields can ship before enablement.
The flag gates new buyer submissions and seller decisions, not refund history,
the payment worker or provider reconciliation of approvals already committed.

Enable only after backend schema/index creation, compatible web/mobile readers,
and local verification. Verify the named `one_active_refund_per_order` partial
unique index and the buyer/key unique index exist; resolve conflicting historical
data before enablement, never delete requests to make an index build succeed.
Deploy backend/executor first, then web and mobile. Require installed clients to
handle `partially_refunded`; do not enable while older supported clients would
misrepresent these payments. Keep the backend running for worker/inbox recovery.

Policy: selected whole units, original discounted price plus allocated tax,
submission within 168 hours of recorded delivery. Shipping is included only on
the final paid-unit selection when this and all earlier confirmed refunds use
seller-fault reasons; `other` remains item-only. Change of mind is pending-only,
and rejected after delivery. Older submitted item-only quotes retain their amount.
Deploy the shipping-aware worker/accounting and web/mobile quote readers together.
Timely
requests remain decidable later. Approval starts payment refund immediately,
without a physical return. COD/PayPal, photos, return logistics, appeals and
automatic decision timeouts remain outside scope. Historical orders without
trustworthy delivery dates or allocations remain ineligible; no date backfill.

Observe requested age (seller silence), processing age (provider pending),
needs_review requests, needs_support payment operations, failed inbox entries,
and any divergence between selected units and refunded+reserved amount. Bank
processing is separate from seller approval. Revenue subtracts confirmed refunded
amounts only; original order totals remain unchanged.

Rollback: disable new submissions/decisions with the flag. Keep the new worker,
schemas, partial-status readers and refund event handling deployed until every
approved request is settled or explicitly reconciled. Never clear reservations,
replace idempotency keys, restore delivered stock or stop workers as rollback.

Local evidence is recorded in `docs/local-payment-verification.md`. Unit/widget
and replica-set integration checks plus real Stripe TEST-mode service verification
are covered. Owner-run web/mobile UI acceptance and hosted checks remain separate;
Playwright/Patrol were intentionally not created, changed or run under AGENTS.md.

## Release decision and evidence

Local gate **passed on 2026-10-18**: real Stripe test-mode web and Android emulator checks covered new/saved cards, separate seller authorizations, capture on seller acceptance, buyer cancellation, and accelerated deadline release. See [local evidence and limitations](local-payment-verification.md) and [backend recovery/CI coverage](backend-payment-verification.md).

The isolated local verification processes already used the enabled flags. This document prepares hosted enablement; it does not change Render/Vercel settings, publish a mobile build, switch Stripe accounts, or enable real-money checkout. Repository examples retain legacy defaults. Hosted webhook delivery, physical-device/iOS behavior, and hosted CI success have not been established by the local run.

Record the deployed commit/build IDs, operator, enablement time, database/Stripe account, monitoring owner, and compatible rollback artifact in the release ticket. Include the local verification record. Do not enable a hosted environment if the checks below are incomplete.

## Flags and matching builds

Before enablement, backend `CHECKOUT_FLOW=legacy`, backend `SELLER_SEES_MANUAL_CAPTURE=false`, web `VITE_CHECKOUT_FLOW=legacy`, and mobile `CHECKOUT_FLOW=legacy` are the defaults. The following settings enable the verified flow:

Backend hosting environment (restart/redeploy to apply):

```env
CHECKOUT_FLOW=manual_capture
SELLER_SEES_MANUAL_CAPTURE=true
ACCEPTANCE_SCAN_INTERVAL_MS=60000
OPERATION_WORKER_INTERVAL_MS=15000
```

Web build environment (rebuild and deploy to apply):

```env
VITE_CHECKOUT_FLOW=manual_capture
VITE_API_BASE_URL=https://your-api-host/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_matching_key
```

Mobile build (the flag is a Dart define, not a dotenv value):

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://your-api-host/api --dart-define=CHECKOUT_FLOW=manual_capture
flutter build appbundle --release --dart-define=API_BASE_URL=https://your-api-host/api --dart-define=CHECKOUT_FLOW=manual_capture
```

The mobile `.env` asset supplies only the matching public `STRIPE_PUBLISHABLE_KEY`. Use matching Stripe test credentials and a separate database for hosted verification. Production credentials are a separate release decision; never put secret keys in web/mobile bundles.

`SELLER_SEES_MANUAL_CAPTURE` controls seller visibility, not checkout creation or worker execution. Enable it before accepting manual-capture orders; otherwise sellers cannot see them. Keep it true while any such orders still need fulfillment, including during rollback. The interval flags change polling frequency, not the acceptance window. Invalid/nonpositive interval values fall back to defaults; they do not disable workers.

The acceptance deadline is persisted per order: the earlier of 24 hours from placement and the authorization deadline minus five minutes. Unfinished checkout drafts expire after 15 minutes. These durations are code policy, not rollout flags.

Flags are environment-wide, not percentage/cohort controls. There is no automatic client negotiation: manual-capture clients receive `409 checkout_flow_disabled` from create/confirm when the backend is legacy. Old card-checkout clients receive `426 update_required` when the backend is manual capture. COD remains available, though newly placed COD orders also receive acceptance deadlines when the backend flag is enabled. Plan mobile distribution and the cutover window accordingly; an installed mobile build cannot be remotely changed with a backend flag.

## Backend and worker requirements

Start with one **always-on** backend process using the current feature-compatible artifact. `npm start` starts HTTP and all four payment loops in the same process, after MongoDB connects:

- Acceptance scanner: startup and every 60 seconds by default; cancels overdue pending authorizations/COD reservations.
- Draft cleaner: startup and every 60 seconds; releases abandoned/failed checkout holds and restores reservations. Also recovers stale finalization after five minutes.
- Payment operation worker: startup and every 15 seconds by default; resumes captures, releases, and legacy refunds and repairs orphaned operations. Intent creation is recovered by the checkout path, not this worker.
- Stripe inbox worker: startup and every 15 seconds; replays persisted received/failed events or abandoned processing claims.

There is no separate worker entrypoint or worker-disable environment variable. Setting `CHECKOUT_FLOW=legacy` does not stop these loops. `AUTO_COMPLETE_ORDERS_ENABLED` controls only the separate shipped-to-delivered job; it does not control payment recovery. Leases are 60 seconds with 20-second heartbeats; operation failures have a five-attempt budget, and uncertain outcomes can require support sooner. Money-changing retries are bounded by the 23-hour idempotency safety window. Keep system time synchronized and all processes on the same intended database/Stripe account.

Sleeping hosts/serverless request handlers do not provide timely deadline scanning. `/health` proves HTTP responds; it does not prove current database readiness or worker progress. Idle loops do not emit regular success heartbeats. Verify progress using durable records and controlled test orders, not just a healthy HTTP response.

MongoDB must support transactions (Atlas replica set or equivalent). Before enabling writes, inspect actual database indexes, not just schema declarations: unique order `paymentIntentId` (sparse), unique operation `idempotencyKey`, unique inbox `eventId`, unique checkout `(buyerId, idempotencyKey)`, and the status/deadline/retry indexes. Back up first. Resolve duplicate legacy intent references before installing the unique index. Do not run `syncIndexes` blindly against existing data.

Follow [legacy reconciliation](legacy-payment-reconciliation.md): run the dry-run audit against the intended database and matching Stripe account, review classifications, then apply only the reviewed classification changes if needed. The duplicate-check command can initialize schema indexes; perform the legacy dry-run with its `autoIndex=false` first. Neither command is a bulk refund tool. Preserve legacy paid orders as legacy: accepting them must not capture/charge again. Historical review cases need a recorded resolution or support owner before rollout.

## Hosted webhook and enablement sequence

1. Keep new checkout traffic paused using the hosting/gateway maintenance mechanism during the coordinated cutover. The application has no maintenance-mode flag. Keep order servicing, Stripe webhooks, and workers available. Prefer an isolated hosted test environment first; do not mix its orders/accounts with production.
2. Deploy the feature-compatible backend with new checkout disabled (`CHECKOUT_FLOW=legacy`). Complete database/index checks and start monitoring. Enable seller visibility before opening the new flow.
3. Register `https://your-api-host/api/payments/webhook` in the matching Stripe account/mode and configure that endpoint's `STRIPE_WEBHOOK_SECRET`. Subscribe to all four handled PaymentIntent events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled`. Preserve raw request bodies. Verify signed delivery and a processed inbox record, including a duplicate delivery. A local CLI signing secret is not the hosted endpoint's secret.
4. Confirm the local gate above and required CI results for the exact release artifact. Keep unverified hosted/device checks listed as incomplete. Retain a rollback artifact that understands manual-capture orders and all recovery jobs.
5. With checkout still paused, set backend `CHECKOUT_FLOW=manual_capture` and `SELLER_SEES_MANUAL_CAPTURE=true`, restart it, deploy the matching web bundle, and install/distribute the matching mobile build. Verify flags and API URLs from the actual artifacts; changing dashboard variables does not rebuild an already installed app.
6. In hosted Stripe test mode, open checkout for controlled verification. Repeat new/saved cards, two sellers, buyer cancellation, seller acceptance, deadline/restart recovery, existing paid-order acceptance, and eligible legacy cancellation. Confirm Stripe amounts/statuses and visible buyer/seller messages. Verify real webhook delivery and physical-device behavior. Do not accelerate production deadlines or use local-only helpers on hosted data.
7. After those hosted checks pass, schedule the production cutover with backups, live-mode webhook/credentials, compatible clients, monitoring, and an operator available. Pause checkout, apply the coordinated flags/builds, then reopen. Record a controlled initial order and its before/after Stripe states. Any real-money verification requires the separately authorized production release.

## Monitoring and response

Configure host log alerts and a read-only database check before opening production checkout. The following are operational instructions, **not an installed monitoring dashboard or alerting service**. A starting cadence is every minute; tune thresholds to observed traffic and provider latency. Assign a person to receive alerts and reconcile affected order/intent/operation IDs.

- Page immediately for `PaymentOperation.status=needs_support` or `ambiguous`, `paymentError.code=unexpected_capture`, or `[Webhook] ALERT`. Inspect Stripe's current intent, charge and refund before taking action. Do not ask the buyer to pay again or create another refund/capture blindly.
- Alert when overdue pending authorized/COD orders persist more than three minutes past `acceptBy`, or capture/release/refund states stay pending for more than five minutes without a progressing operation. Check database connectivity, process uptime, lease/retry times, and worker errors.
- Alert for inbox `received`/`failed` records older than ten minutes, or `processing` records with expired leases that remain unclaimed for two minutes. Also watch Stripe webhook delivery failures/signature errors and the host's 5xx rate.
- Check failed/expired checkout sessions for unresolved seller holds and incomplete stock restoration; compare intent status in Stripe. A `release_pending` order is not proof its hold was released. A `refund_pending` order is not proof a refund succeeded.
- Track checkout success/failure, authorization-to-capture conversion, capture failures, release backlog, legacy refund backlog, oldest outstanding operation, and `409`/`426` responses during cutover. Compare with the prior baseline. Current code emits logs and durable state; it does not export these as metrics automatically.

Useful log prefixes: `[AcceptanceScanner]`, `[DraftCleaner]`, `[PaymentWorker]`, `[StripeInbox]`, `[Webhook]`. Empty logs alone do not establish worker health. Keep secrets, client secrets, and card details out of incident notes; use record IDs for correlation.

Read-only examples for `mongosh`/Atlas's intended database (thresholds are initial alert guidance):

```javascript
const now = new Date();
db.paymentoperations.find(
  { status: { $in: ['needs_support', 'ambiguous'] } },
  { action: 1, orderId: 1, checkoutSessionId: 1, paymentIntentId: 1, status: 1, attempts: 1, nextAttemptAt: 1, updatedAt: 1 }
);
db.orders.find(
  { status: 'pending', paymentStatus: { $in: ['authorized', 'not_required'] }, acceptBy: { $lt: new Date(now.getTime() - 180000) } },
  { paymentIntentId: 1, paymentStatus: 1, acceptBy: 1 }
);
db.orders.find(
  { 'paymentError.code': 'unexpected_capture' },
  { paymentIntentId: 1, status: 1, paymentStatus: 1 }
);
db.stripeeventinboxes.find(
  { status: { $in: ['received', 'failed', 'processing'] }, receivedAt: { $lt: new Date(now.getTime() - 600000) } },
  { eventId: 1, type: 1, status: 1, attempts: 1, leaseExpiresAt: 1, nextAttemptAt: 1 }
);
```

## Rollback without abandoning existing payments

1. Record the incident and pause **new** checkout through the host/gateway. Inventory open/finalizing sessions, authorized orders, captures/releases/refunds in progress, and unresolved inbox records. Capture IDs and current Stripe state.
2. Keep the feature-compatible backend, workers, webhook endpoint/signing secret, database records/indexes, and `SELLER_SEES_MANUAL_CAPTURE=true`. Existing orders still need acceptance/cancellation, capture completion, deadline release, and legacy refunds. Disabling new checkout does not reverse an already started capture.
3. For a quick containment switch, set backend `CHECKOUT_FLOW=legacy` and restart. This rejects new manual session creation **and confirmation**. Already authorized but unplaced sessions cannot be confirmed while disabled; the cleaner will expire/release them. Existing placed orders continue through their persisted flow. Do not delete sessions or operations to clear the backlog.
4. Restore/rebuild web and distribute mobile with their checkout flags set to `legacy`, targeting the same compatible API. Reopen legacy checkout only when clients match. Manual-capture mobile builds still installed will receive `409` on new checkout until replaced; older legacy clients receive `426` while the backend is manual. Announce the update/maintenance window rather than claiming seamless rollback.
5. Reconcile pending records against Stripe and verify worker progress after restart. Existing captured payments stay captured; a flag change is not a refund. Use the supported eligible-cancellation path or investigated support resolution. Never reset payment state, reuse an old key to force a new operation, or restore an old database snapshot as a payment rollback: Stripe money movements would remain external to that restore.
6. Do not deploy an artifact predating manual-capture support while manual sessions/orders/operations remain. If a code regression requires a version change, choose a known compatible build retaining recovery and legacy handling. Keep recovery running until all outstanding financial work is resolved, even after new-flow checkout is disabled.

## Go/no-go checklist

- [x] Local web and Android emulator Stripe test-mode checks passed; evidence linked above.
- [ ] Exact release commit reviewed, committed, and hosted CI passed; artifacts retained.
- [ ] Target database/Stripe account and indexes audited; backup and legacy review ownership recorded.
- [ ] Always-on backend and recovery progress verified in the hosted environment.
- [ ] All four signed webhook event types delivered/processed; retries verified.
- [ ] Matching web/mobile flags and URLs verified; physical-device release checks completed for supported platforms.
- [ ] Alert routing, support owner, checkout maintenance mechanism, and compatible rollback build ready.
- [ ] Controlled hosted checks passed; production enablement time and separately authorized live release recorded.

Only the local gate is complete in this workspace. Check off the remaining items using evidence from the actual deployment, then enable that environment.
