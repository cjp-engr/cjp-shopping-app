# Execution ledger — delivered-item-refunds

Shipping amendment (2026-10-18): approved seller-fault full-order shipping refund;
change of mind stays pending-only, rejected after delivery. Backend quote/history,
approval, durable worker and atomic shipping reservation/settlement implemented.
Every previous confirmed refund must also establish seller fault to include shipping
with the final remaining paid unit; `other` is item-only. Old shipping-absent quotes
are honored, with no automatic top-up. Web/mobile separately show shipping in quotes
and history. API schema and manual verifier updated; old Stripe evidence preserved.

Regression checks observed failing before fixes: full shipping settlement, `other`
shipping exclusion, earlier non-fault history, and missing client quote support.
Full verification: backend259 unit +33 contract +402 replica-set integration,
TypeScript clean; web133 unit, TypeScript and full ESLint clean; Flutter210 passed
with5 existing legacy-flow skips and clean Dart analysis. Fresh read-only review
found no actionable correctness gap. An additional one-item full-refund regression
passed in a final24-case settlement run after that full run. All tests mock Stripe; actual Stripe shipping
check and owner web/mobile UI acceptance remain outstanding. No automation paths,
environment files, owner processes, commits, branches or deployments changed.

Plan: docs/superpowers/plans/2026-10-18-delivered-item-refunds.md (read-only).
Continuation on 2026-10-18: existing feature branch and uncommitted Tasks 1/2 plus
Task 3 schema foundation preserved. No new branch/worktree: AGENTS explicitly
prohibits branch changes without user authorization. No commits or automation.

Preflight: Task 3 consumes reviewed allocation/eligibility and produces durable
delivered-purpose operations; Task 4 must dispatch them independently of legacy
cancelled-order refunds. Tasks 5/6 consume public views only. Keep quantities taken
equal to confirmed+reserved amounts; Task 3 reserves at approval, not submission.

Ruling: repository instructions override plan automation and commit checkpoints.
Playwright/Patrol steps are skipped; use backend integration, web unit and mobile
widget/unit tests. All integration connections must target port27018 and `_test`.

Task 3: in progress. Added request integration tests first.

Task 3: service, API, validators and contract wiring implemented. Initial full run:
256 unit, 33 contracts, 369 integration passed. Fresh approval review found and
reproduced a preflight idempotency race and legacy-worker misdispatch. Both received
RED-to-GREEN regressions. Task 4 replaces the temporary deferral guard with the
dedicated delivered executor. Final combined suites still required.

Task 4: in progress. Partial settlement, provider-pending/review reconciliation,
atomic aggregates, immediate post-approval attempt, and durable inbox dispatch
implemented. Real worker crash after provider refund creation recovered in a new
process without another refund. Unit/provider test doubles are used, no Stripe
credentials or live requests. Manual checkout metadata uses checkoutSessionId,
sellerId and draftOrderId (not userId); verify buyer against the placed checkout.

Tasks 5/6: web request/review screens and mobile BLoC/forms are implemented.
Web132 unit tests, typecheck and full lint passed. Flutter209 tests passed with
5 existing legacy-flow skips; new refund model/BLoC/widget tests passed. Dart
analysis is clean after style fixes. No Playwright/Patrol changes or runs.

Final review: two important recovery findings reproduced RED: transient provider
reads incorrectly blocked approved refunds permanently; the oldest50 review
requests starved later ones. Fixed by safe pre-create read retries and scheduled
review polling.21 settlement integration cases pass. Final combined suites pending.

Manual Stripe TEST-mode check: passed. Fresh manual-capture payment2660 accepted
through the seller service; shipped/received through existing services. Two
approved unit refunds1080 each succeeded, shipping500 retained, fulfillment
delivered, stock/sold unchanged. Evidence in ignored backend/test-results and
docs/local-payment-verification.md. No live-mode requests or process changes.

Ruling: schema views include server-derived requestsEnabled/canDecide so clients
cannot infer a disabled backend capability from their own build settings.
Ruling: per-unit product names are snapshotted with the quote so seller review
shows the selected items after product deletion without repricing them.
Ruling: temporary delivered-worker deferral was removed when Task4's executor
was installed. Existing legacy refund routing remains intact.

Final verification complete (2026-10-18): backend256 unit,33 contract,393
integration passed; tsc clean. Web132 tests, full lint, types and production build
passed. Mobile209 passed/5 existing skips; analysis clean. Both review findings
were reproduced RED-to-GREEN; final combined suite is green. Hand-off updated.
No commits/pushes/deployments/environment-file changes or forbidden automation.
Remaining release gate: owner browser/native UI acceptance, hosted/old-client
compatibility checks and explicit feature enablement. Existing plan remains intact.
