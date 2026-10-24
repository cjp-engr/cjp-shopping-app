# Order notifications: web and mobile

Status: **Draft for owner review; not approved for implementation.**

Stored under `docs/specs/` so the design can be included in a PR; this repository ignores `docs/superpowers/specs/`.

Written 2026-10-23 against branch `feat/order-notifications`, commit `160dd52`. This document describes proposed behavior, not completed work.

## Purpose and scope

Give buyers and sellers a saved, shared inbox for important order updates. A buyer can place an order on mobile, a seller can accept it on web, and the buyer can find the notification on either platform. Read state belongs to the account and is shared across devices.

The owner chose notifications before the order activity timeline. The event list, delivery approach, and UI behavior below are recommendations awaiting review.

Version 1 includes an authenticated inbox, unread badge, All/Unread filters, pagination, individual read actions, and navigation to the relevant order/refund. It includes new-order, fulfillment, cancellation, and refund updates for buyers and sellers.

Deferred: order activity timeline, remote push (FCM/APNs), web push, email/SMS, preferences, notification deletion, and historic notification backfill. A closed app receives no immediate alert; committed notifications remain available on the next visit.

## Existing implementation, verified by source inspection

- Web `frontend/src/hooks/useSellerOrderNotifier.ts` polls seller orders every 30 seconds and compares IDs in memory. `frontend/src/components/layout/Layout.tsx` displays temporary seller toasts that open the seller Orders tab.
- Mobile `frontend-mobile/lib/shared/widgets/main_shell.dart` similarly polls seller orders. `frontend-mobile/lib/shared/services/notification_service.dart` displays local device notifications and opens the seller Orders tab. These are local alerts, not remote push.
- The mobile products-screen bell currently has an empty callback.
- No shared backend notification model, notification routes, or persisted read state was found in the inspected source. Existing polling cannot provide durable notification history.
- These observations are source inspection only. No runtime verification or tests were performed for this documentation task.

## Proposed notification events

Each event refers to one seller's order. Multi-seller checkout creates separate notifications scoped to the corresponding order and recipient. A seller account may also buy; route and ownership depend on the event's recipient context, not just the account's seller role.

- `order_placed` -> seller, only when a real buyer-visible/seller-visible order is committed. Never notify for `awaiting_payment` drafts, failed checkout, or abandoned authorizations.
- `order_preparing` -> buyer, after the transition to `preparing` is committed. For manual-capture cards, this follows verified capture; an acceptance click or `capture_pending` state is insufficient. Copy says the seller is preparing the order; it does not claim payment capture for COD or previously captured legacy orders.
- `order_shipped` -> buyer, on the committed transition to `shipped`.
- `order_delivered` -> buyer, on the first committed delivery transition, including automatic completion. A delivery timestamp repair is not a new delivery event.
- `order_cancelled` -> the other order participant when the buyer or seller cancels; both participants for system cancellation/expiry. Copy identifies who cancelled or that the acceptance deadline expired. It never claims money was refunded or a hold was released merely because cancellation succeeded.
- `payment_released` -> buyer, only after a cancelled order's authorization release is confirmed and persisted. Describe a hold release, not a refund or guaranteed bank posting time.
- `cancellation_refund_completed` -> buyer, only after a captured cancelled payment's refund is confirmed and persisted. Use the existing legacy-refund/recovery path; do not create another Stripe request.
- `refund_requested` -> seller, when a delivered-item refund request commits.
- `refund_approved` -> buyer, when seller approval commits the request to `processing`; wording is "Refund approved — processing", not "Refund completed".
- `refund_rejected` -> buyer, when rejection commits; open the request to see its explanation.
- `refund_completed` -> buyer and seller, after a delivered-item refund's confirmed success commits. Partial refunds show that request's amount and currency, not the full order total.

No notification for internal payment retries, claims, failed transactions, or repeated identical requests. `needs_review` remains visible in existing refund details; a dedicated review-required notification is deferred. COD/other methods receive applicable order events but no unsupported card-payment events. Refund events follow the existing feature gates and actual committed operations.

## Inbox behavior on both platforms

- A bell with an accessible unread-count label opens `/notifications`; display badges as `99+` above 99 while retaining the real count for accessibility.
- Newest inbox entries first. Each entry shows an icon, concise title, short order reference, store/context, occurrence time in the device locale, unread styling, and an optional formatted refund amount.
- All and Unread tabs, an empty state, initial loading, refresh, load-more, and an error/retry state are required. A failed refresh retains previously loaded data and never silently clears the badge.
- Opening the inbox does not mark every notification read. Tapping an entry sends an idempotent mark-read request and navigates to its authorized target. A separate accessible Mark as read action supports reading without navigation. No mark-all operation in version 1.
- The order screen always fetches current state. A notification is a historic event, not proof that an action is still allowed. Missing/inaccessible targets show a helpful message with a route back to the inbox.
- Web uses a keyboard-accessible bell, readable focus states, and restrained live announcements. Mobile uses the same semantic states and does not rely only on color to distinguish unread entries.
- Existing mobile buyer detail routing is `/orders/:id`; web has `/orders/:id` and `/seller/orders/:id`. Add the mobile route `/seller/orders/:id`, loading through an authenticated seller-owned order lookup. Reuse the existing seller detail-sheet presentation where practical without sending seller notifications through the buyer detail loader. Add `GET /api/seller/orders/:id` for this lookup, applying the same ownership/visibility rules as the existing seller list and returning 404 for missing/foreign orders. Both clients accept an optional `refundRequestId` query parameter to focus the matching request inside that order; an unrelated request ID cannot load another order's data. A generic seller Orders tab alone is insufficient.

## Delivery and account lifecycle

Proposed version 1 uses polling without adding a push provider or WebSocket dependency. Poll the unread summary every 30 seconds while authenticated and visible/foreground; fetch the active inbox page when open. Refresh on login, browser focus/app resume, and manual refresh. Do not overlap requests; back off on network errors and respect server rate limits, including 429 responses.

The server inbox is authoritative. Initially fetch history and badge without replaying old toast/device alerts. Replace the existing order-ID polling for seller new-order alerts so two mechanisms do not notify for the same event. In-app banners may announce newly observed entries during an active session; events discovered after login/resume remain in the inbox without an alert flood.

Preserve the existing mobile foreground seller new-order local alert, fed by new inbox event IDs, never by a second seller-order poller. The summary response includes `latestNotificationId`; when that marker changes during an uninterrupted foreground session, fetch the first All page even when the inbox is closed. Compare against the session's prior baseline, deduplicate by notification ID, and show at most one grouped seller-new-order alert per poll. A burst larger than one page may be summarized without one alert per order; all entries remain available through pagination. Other events need only inbox/badge presentation, with optional restrained in-app banners. First login, re-enable, and resume establish a fresh marker without replaying old local alerts. Device permission denial must not affect the inbox. Do not expand OS notification permissions or promise background delivery in this version.

Abort requests, cancel timers, and clear account-scoped lists, cursors, badges, and alert IDs on logout/account change. Ignore late responses from a previous account/session. On resume, fetch authoritative read state; marking an entry read on web updates mobile within the next successful poll.

## Durable backend design

Use an order-event outbox plus per-recipient inbox rows. The outbox is transport infrastructure for notifications; it does not expose or implement the deferred activity timeline.

1. Persist an immutable `OrderNotificationEvent` inside the same MongoDB transaction as each successful business transition. Existing transactional paths reuse their session. Existing standalone status saves, including shipment, delivery/automatic delivery and applicable legacy paths, must be made atomic with their event insertion; a best-effort post-save call is unacceptable.
2. Each event has a unique deterministic `eventKey`: order-once transitions use order ID and event type; refund transitions use request ID and event type; release/cancellation refund settlement uses the stable payment-operation identity and event type. Derive recipients from the committed order/request, never client input. Store the buyer/seller context even when one account has both roles. Collapse duplicate recipients for the same event to one row. Apply the recipient rules above literally: only manual cancellation suppresses the actor's notification. A buyer confirming receipt still gets the delivery receipt notification, and a seller still gets confirmed refund settlement even if they approved it.
3. A restart-safe background projector upserts a `Notification` per `(eventId, recipientId)`, enforced by a unique database index. Mark the outbox event projected only after all recipients are durable. A crash between recipients or concurrent workers retries safely; use the existing worker/lease conventions and do not reset an existing row's `readAt` on replay. Outbox events remain recoverable until acknowledged. Persistent failures remain pending and are logged with safe IDs for investigation.
4. No Stripe calls or new payment operations are introduced by notification delivery. Business-transition rollback also rolls back its event. External Stripe success followed by a crash is handled by the existing recovery code, which must insert the event when it finally persists the verified result.
5. No backfill on rollout: existing historic state must not generate events by scanning all old orders. An existing order's new transition after enablement may produce an event. Keep existing records indefinitely in version 1; retention/TTL is a later decision.

Transaction rollout boundary: require a replica set when enabling notifications and fail startup with a clear configuration error before accepting requests if the database does not support transactions. When notifications are disabled, preserve existing standalone-path behavior rather than unconditionally adding a transaction requirement to those paths. Existing transaction-dependent checkout/refund flows still require a replica set regardless of the notification flag. For enabled automatic delivery, replace the bulk `updateMany` transition with bounded batches of conditional per-order transactions and event insertion, preserving each order's original `shippedAt + 48h` delivery/refund timestamps. Make confirmed legacy refund settlement and its event atomic while leaving Stripe calls outside the transaction and retaining the existing stable payment-operation keys and recovery behavior. Never change fulfillment/payment outcomes merely to make notifications easier.

Proposed event fields: `_id`, `eventKey`, `type`, `orderId`, optional `refundRequestId`/payment-operation identity, `actorType`/optional `actorId`, recipient IDs with context, immutable `occurredAt`, safe message data, and projection/lease metadata. Optional money uses integer `amountMinor` and a currency code. No credentials, addresses, card details, client secrets, or free-form report descriptions in notification payloads.

Proposed inbox fields: `_id`, `eventId`, `recipientId`, `recipientContext`, `type`, `orderId`, optional `refundRequestId`, safe immutable message data, `occurredAt`, insertion `createdAt`, and nullable `readAt`. Index unique `(eventId, recipientId)` plus `(recipientId, createdAt desc, _id desc)` and an unread-query index. Sort/paginate by inbox insertion `(createdAt, _id)`, not a backdated event occurrence time. Refresh the first page to discover late projections; deduplicate merged pages by inbox ID.

## Proposed authenticated API

- `GET /api/notifications?filter=all|unread&limit=20&cursor=...` returns `{ success: true, notifications, nextCursor }`. Enforce limit 1–50, validate cursor/filter, scope every query to the authenticated user, and use descending keyset pagination. A cursor is a position, never permission to access another user's records.
- `GET /api/notifications/unread-count` returns `{ success: true, unreadCount, latestNotificationId }` for that account across buyer/seller contexts. The marker is the newest inbox entry by `(createdAt, _id)`, or null for an empty inbox. It is independent of read state. Counts are recomputed from durable rows; page size is not the badge count.
- `PATCH /api/notifications/:id/read` returns `{ success: true, notification }`. Set `readAt` only if absent. Repeating it preserves the original timestamp. Another user's ID is indistinguishable from a missing ID (404); unauthenticated requests return 401.
- Return server-defined target data (`orderId`, `recipientContext`, optional `refundRequestId`), not arbitrary URLs. Clients map those identifiers to known routes. Render content as plain text.
- A separate page/count response can briefly differ during writes; the next refresh reconciles it. After marking read, refetch the count rather than subtracting blindly on repeated taps. The unread tab removes the entry and preserves usable pagination.

## Enablement and operational expectations

Proposed backend flag `ORDER_NOTIFICATIONS_ENABLED=false` by default gates event creation and API availability (disabled API returns a consistent 503 code `order_notifications_disabled`). An authenticated capabilities endpoint, `GET /api/notifications/capabilities`, always returns `{ success: true, enabled }`; both clients use it to show the new bell/inbox when enabled and retain only existing seller alerts when disabled. A disabled response clears new-feature caches and stops polling; recheck capabilities on login/resume.

The projector continues draining already-committed events even if event creation is disabled. This keeps rollback from discarding pending work. Re-enabling shows saved entries without replaying historical alerts. No separate client build flags are required for this proposal.

Roll out only after focused backend/API, React, and Flutter checks pass and the owner completes web/mobile acceptance checks. Register/stop the projector alongside existing startup/background loops. Monitor pending-event age/count, projection errors, duplicate-key retry rates, API failures, and inbox poll volume; do not log notification payloads containing personal data. No hosted deployment or flag changes are part of this documentation task.

## Acceptance and automation opportunities

- Buyer orders on mobile -> exactly one seller notification per visible seller order appears on web; another seller sees none. Repeat with web buyer/mobile seller.
- Seller accepts -> buyer receives preparing notification only after committed success; failed/ambiguous capture has no premature success notification. Retry and concurrent acceptance do not duplicate it.
- Shipment and manual/automatic delivery each notify once. Delivery timestamp repair and job replay do not create duplicates.
- Buyer/seller/system cancellations notify the specified counterpart(s); release/refund wording waits for confirmed settlement. Acceptance-versus-cancellation races publish only committed outcomes.
- Request, approve, reject, partial refund, and completed refund use the correct request, amount, audience, and state. Approval never masquerades as completed money movement.
- Crash after a business commit, crash during projection, duplicate webhooks, and multiple workers preserve events with one inbox row per recipient and no read-state reset.
- Refresh/restart preserves history/read state; polling updates cross-device badges. Logout/account switching, permission denial, offline/resume, and late responses cannot leak data or replay old alerts.
- Validate unread pagination, equal-time ordering, new inserts, invalid cursors, missing targets, unrelated-user access, 401/404/429, keyboard/screen-reader access, and empty/error states.

Backend tests mock Stripe and use only a replica-set database on port 27018 whose name ends in `_test`. Implementers run only tests they add/change plus relevant type-check/lint/analyzer checks unless full suites are explicitly requested. Playwright and Patrol scenarios above are suggestions for the owner: agents must not create, edit, run, or fix either automation suite.

## Source map for implementation planning

- Order placement/visibility: `backend/src/services/orderService.ts`, `checkoutFinalization.ts`, `checkoutWebhook.ts`, `orderVisibility.ts`.
- Acceptance/capture: `backend/src/services/orderAcceptance.ts`, `orderCapture.ts`, `sellerService.ts`.
- Cancellation and settlement: `backend/src/services/orderCancellation.ts`, `sellerCancellation.ts`, `acceptanceScanner.ts`, `paymentRelease.ts`, `legacyRefund.ts`, `legacyPayments.ts`, `paymentOperationWorker.ts`, `stripeInboxWorker.ts`.
- Delivery: `backend/src/services/orderDelivery.ts`, `backend/src/jobs/autoCompleteOrders.ts`.
- Delivered refunds: `backend/src/services/refundRequestService.ts`, `deliveredRefund.ts`.
- Server routing/workers: `backend/src/server.ts`; follow existing routes/controllers/auth middleware and worker cleanup conventions.
- Web: existing seller notifier, `Layout.tsx`, `Navbar.tsx`, `frontend/src/App.tsx`, `frontend/src/config/api.ts`, and auth context.
- Mobile: existing `MainShell`, notification service, products bell, auth BLoC, `frontend-mobile/lib/routes/app_router.dart`, and existing order/seller detail screens.

## Review required

Owner review should confirm the event list, 30-second foreground polling, individual read actions without mark-all, and replacement of existing seller alerts. These are proposed defaults, not previously approved requirements. After the design is approved, finalize the task-level implementation plan; do not implement from an unapproved draft.
