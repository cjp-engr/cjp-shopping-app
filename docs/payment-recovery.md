# Payment recovery and buyer cancellation

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
captured payments or change legacy paid-order cancellation behavior.

## Recovery loops

The existing payment-operation worker now handles checkout-level releases as well as
order-level capture and release. It excludes intent creation and refund operations.
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

Tests cover buyer ownership, duplicate cancellation, acceptance/cancellation races,
stock and coupon restoration, uncertain hold releases, checkout retry after restoration,
cleanup pagination, slow-release leases, failed webhook replay, duplicate event claims,
and recovery after processing is interrupted. Database integration tests use a separate
local replica-set database ending in `_test` and mock Stripe calls.

Before rollout, verify hold creation, buyer cancellation, and hold release in Stripe
test mode from both web and a physical mobile device. Keep production checkout flags
unchanged until the remaining rollout and legacy-payment work is reviewed.
