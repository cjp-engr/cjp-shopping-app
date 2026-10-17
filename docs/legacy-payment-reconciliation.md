# Existing paid orders

Legacy card orders were charged at checkout. They stay on the legacy payment flow: seller acceptance verifies the original Stripe payment, then changes fulfillment to preparing without creating or capturing a payment. No acceptance deadline is added to old orders. Historic processing/shipped/delivered orders keep their fulfillment state.

## Buyer cancellation

Only a pending order can enter this path. The backend verifies the original captured Stripe intent, its buyer metadata, exact order total in USD, charge, and refund history. Missing payment IDs (including historical mock/saved-card checkouts), shared IDs, wrong amounts/buyers/currencies, unpaid intents, partial refunds and unrelated active refunds require support review. The backend does not guess or charge again.

An eligible buyer cancellation returns the **full order total, including tax and shipping, to the original payment method**. Cancellation, once-only inventory/sold-count/coupon restoration, and the refund job commit together. The atomic pending-state claim decides a race with seller acceptance: acceptance winning means cancellation/refund is refused; cancellation winning means acceptance is refused.

The order is cancelled immediately, with payment status `refund_pending`. A stable `order:<id>:refund:1` key and Stripe metadata identify its single refund. The worker checks existing Stripe refunds before retries, records the refund ID, and polls pending refunds. Only a succeeded Stripe refund changes payment status to `refunded`. Failed/cancelled/action-required refunds, exhausted errors, mismatches and uncertain outcomes after the 23-hour retry window require support; the UI shows Payment needs review. Support must inspect Stripe before resolving the existing operation, never start another refund blindly. Stock restoration and cancellation remain committed even while a refund needs review.

Refund success means Stripe has processed the refund; the buyer's bank may take additional time to display it. This implementation does not add seller-cancellation or post-delivery dispute eligibility. Seller card cancellations are blocked in the API and hidden on web/mobile until their own refund/release path exists; existing legacy COD cancellation remains available.

## Audit and classification

Set the intended `MONGODB_URI` and corresponding `STRIPE_SECRET_KEY` in the backend environment, and run from `backend`:

```powershell
npm run migrate:check-intents
npm run migrate:legacy-payments
```

The legacy audit is a **dry run by default**: it reads Stripe and orders, prints per-order classifications and totals, and never changes data or moves money. It disables automatic index creation so shared legacy intent IDs can be reported before installing the unique index. Exit 0 means no review cases, 1 means review cases exist, and 2 means the command could not run. Stripe read failures are reported as unavailable and leave the order unchanged.

After reviewing the output, persist classifications with:

```powershell
npm run migrate:legacy-payments -- --apply
```

Apply changes payment fields only. Its conditional writes avoid overwriting concurrent acceptance/cancellation. It does not create refunds, payment operations, deadlines, or change fulfillment. Orders with active refund jobs and already-refunded orders are skipped. Already-cancelled historical orders with captured money are explicitly flagged for manual reconciliation; this command never bulk-refunds them or restores stock retrospectively.

Resolve shared intents before enabling the unique intent index. Do not assign the whole charge to each seller order or alter recorded totals to make verification pass. Reconcile missing references against Stripe/accounting evidence. This code was tested with mocked Stripe and a local test database; no production audit or refund was run.
