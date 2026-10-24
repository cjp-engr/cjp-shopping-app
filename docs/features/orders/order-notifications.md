# Order notifications

## Status

- Implementation: limited seller new-order polling alerts exist on web and mobile. The shared notification inbox described below is **planned, not implemented**.
- Verification: source inspected 2026-10-23 on `feat/order-notifications`, commit `160dd52`. No runtime checks or test suites run for this documentation task.
- Enablement: existing seller alerts are conditional on authentication and seller role. Proposed `ORDER_NOTIFICATIONS_ENABLED` does not exist yet.
- Deployment: unknown; source inspection does not establish what is deployed.

## What exists

Web polls seller orders every 30 seconds and displays transient toasts. Mobile polls seller orders and uses local device notifications. Both keep known order IDs in memory; there is no backend notification history or synchronized read state in the inspected source. Mobile's products-screen bell has no action.

Source paths:

- `frontend/src/hooks/useSellerOrderNotifier.ts`
- `frontend/src/components/layout/Layout.tsx`
- `frontend-mobile/lib/shared/widgets/main_shell.dart`
- `frontend-mobile/lib/shared/services/notification_service.dart`
- `frontend-mobile/lib/features/products/presentation/screens/products_screen.dart`

## Proposed scope and rules

Buyers and sellers share a durable account inbox across web/mobile, with unread counts, individual mark-read, pagination, and links to exact orders/refunds. Important order, cancellation, and refund transitions create recipient-scoped events. Notifications must reflect committed business/payment outcomes and deduplicate retries; approving a refund is distinct from completing it.

Start with polling while the app is active. Remote push, email/SMS, the order timeline, and historic backfill are deferred. Mobile local-alert permission is not required to use the inbox. Seller accounts that also buy must receive and open notifications in the correct buyer/seller context.

## Remaining work

Approve the draft design, finalize the implementation plan, implement backend event persistence/projection/API, add web/mobile inboxes, replace existing seller-ID polling, and verify cross-device behavior. The owner creates/runs Playwright and Patrol coverage separately.

## Design

- [Draft design and acceptance criteria](../../specs/2026-10-23-order-notifications-design.md)

No implementation or deployment is implied by this feature file.
