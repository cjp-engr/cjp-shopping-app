# Payment recovery and cancellation

## Buyer cancellation

For orders placed using manual capture, the owning buyer may cancel while the order
is pending and its payment is authorized or cash-on-delivery requires no payment.
The cancellation atomically changes the order and restores its reserved product or
variant stock, sold count, and coupon capacity once. Repeating cancellation returns
the same cancelled order without releasing or restoring again.

Acceptance and cancellation compete for the same pending payment state. If the seller
has claimed acceptance, cancellation returns `409 cancellation_conflict`. Clients hide
cancellation during capture and show a failure if acceptance wins a race.

Cancellation completes fulfillment cancellation even if releasing the card hold is
temporarily unavailable. `release_pending` means the hold is still being released;
`released` means Stripe confirmed cancellation of the authorization. Bank balances
can take additional time to reflect release. This does not issue refunds for already
captured payments. Legacy paid-order cancellation uses the separate refund path documented in
[Existing paid orders](legacy-payment-reconciliation.md).

## Seller cancellation of pending orders

A seller can cancel their own order while it is pending, with a required reason (trimmed,
1 to 1000 characters). It uses the same atomic claim as acceptance, buyer cancellation and
the deadline scanner, so exactly one of them wins and reservations are restored once.

Supported orders: a pending manual-capture card order whose payment is `authorized` (the
hold is released), and a pending cash-on-delivery order with `paymentStatus: not_required`
(no Stripe request). Everything else is refused with `409 cancellation_unavailable` and
left unchanged: legacy-shaped card orders, orders without a persisted `sellerId`, and any
other payment state. An order whose capture is in progress (`capture_pending`) or that is
no longer pending is refused with `409 cancellation_conflict`; the seller refreshes.
Ownership is the persisted `sellerId` only, so deleting a product never revokes it.

The order records who cancelled it (`cancelledByRole`: `buyer`, `seller` or `system`;
`cancelledById`; `cancelledAt`) once, in the claim. A repeated request from the same seller
returns the stored order unchanged and never changes the first actor. The deadline scanner
and expired holds are recorded as `system`.

Cancelling the order can succeed while the hold release is still settling. The response
carries `paymentOperation` for card orders: `pending` while the release is in progress,
`completed` once Stripe confirms the PaymentIntent is canceled, `needs_review` when the
release operation (`order:<orderId>:release:1`) is in `needs_support`. COD orders carry no
`paymentOperation`. Clients must not describe a pending release as money returned.

Monitoring: cancelled orders with `cancelledByRole: 'seller'` and `paymentStatus:
release_pending` are releases still in flight; a `needs_support` release operation needs a
person to compare the order with the Stripe PaymentIntent. The payment-operation worker
finishes interrupted releases with the original key, and also repairs a cancelled order left
`release_pending` when its release operation is missing or already succeeded. There is no
feature flag for this action; blocking it would need a code change.

## Recovery loops

The existing payment-operation worker now handles checkout-level releases as well as
order-level capture, release, and legacy refunds. It excludes intent creation operations.
Release operations retain a stable idempotency key and renew their lease while Stripe
calls are in progress. Temporary failures retry with backoff, up to the existing five
attempts. Exhausted operations remain `needs_support` and are never labelled successful.
Older release operations escalated on their first network timeout can resume within
that same attempt budget.

The draft cleaner continues revisiting unresolved holds after stock restoration.
It paginates through all candidate batches, so exhausted releases cannot permanently
block later expired checkouts. It never restores the same reservations twice.

A Stripe inbox worker runs at startup and every 15 seconds. It claims failed, received,
or abandoned processing records using a lease and heartbeat. Only one worker owns an
event at a time. Failed handlers retry with exponential backoff capped at ten minutes;
successful events are not replayed. Webhook handlers return 500 on processing failure,
allowing Stripe delivery retries as well.

New inbox records store a minimal handler snapshot: object ID, checkout identifiers,
and payment-error code/message. They exclude card details and client secrets. Older
records without snapshots use Stripe's event retrieval API. If an old event is no
longer retrievable, investigate the logged event ID and Stripe state; do not delete the
record or assume the payment operation completed.

All loops run in the backend process. The host must remain running for timely recovery.
On restart, overdue work is picked up from durable database records. Watch backend logs
and `PaymentOperation` entries in `needs_support`; a pending release is not proof that a
hold has already disappeared from the buyer's bank.

## Verification

Tests cover seller cancellation (ownership by persisted `sellerId`, reason validation,
unsupported shapes, repeat requests keeping the first actor, release timeout finished by the
worker, seller races against acceptance, the buyer and the deadline scanner), buyer ownership,
duplicate cancellation, acceptance/cancellation races,
stock and coupon restoration, uncertain hold releases, checkout retry after restoration,
cleanup pagination, slow-release leases, failed webhook replay, duplicate event claims,
and recovery after processing is interrupted. Database integration tests use a separate
local replica-set database ending in `_test` and mock Stripe calls.

Before rollout, verify hold creation, buyer cancellation, and hold release in Stripe
test mode from both web and a physical mobile device. Local web and Android emulator
verification is recorded in [Local payment verification](local-payment-verification.md).
Follow [Payment rollout](payment-rollout.md) before changing hosted checkout flags;
it covers always-on workers, monitoring, coordinated enablement, and rollback. See
[Backend payment verification](backend-payment-verification.md) for full-flow, process-restart,
deadline coverage and the database integration CI job.
