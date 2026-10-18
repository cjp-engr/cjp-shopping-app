# Local payment verification — 2026-10-18

## Environment

- Web: `http://localhost:5173`, built with `VITE_CHECKOUT_FLOW=manual_capture`.
- API: `http://127.0.0.1:5001/api`, running `CHECKOUT_FLOW=manual_capture` and `SELLER_SEES_MANUAL_CAPTURE=true`.
- Separate local replica-set database: `tokomart_local_payments_20261017` on port 27018.
- Existing environment files were left unchanged. Stripe credentials were read privately from the backend environment file; every inspected intent has `livemode=false` and `capture_method=manual`.

The verification originally used web port 5174 to avoid the older web/API on 5173/5000. After the local checks passed, the user retired that setup: the old processes were stopped and the verified web moved to 5173, still using API 5001 and the same isolated database. Local backend/frontend environment settings and the default VS Code mobile debug launch now select this setup. No old database was deleted. Historic results below were obtained before the port move; deployed apps are unchanged.

After the move, the new-card authorization and two-seller acceptance/cancellation web cases passed again on 5173 (3 passed including buyer authentication setup). The normal Android app was rebuilt/launched with `API_BASE_URL=http://10.0.2.2:5001/api` and `CHECKOUT_FLOW=manual_capture`; product and account requests returned 200. Local web test environment settings now use web 5173/API 5001. Reload the browser after the move; use the default VS Code mobile debug configuration for subsequent runs.

## Web: passed

The existing Playwright authorization suite passed for a new card, a saved card, and a two-seller checkout. Read-only Stripe API inspection confirmed four separate authorizations with `status=requires_capture`, the full amount capturable, and `amount_received=0`.

The new opt-in local settlement suite passed buyer/seller UI actions:

- Seller accepted order `6ad4758de66f6d06139b8c19`. Its intent `pi_3URoWeJrMKRA89iL0rWFzkYj` became `succeeded`; `amount_received=2700`, `amount_capturable=0`. The order became preparing/captured, and the buyer saw Payment charged.
- Buyer cancelled the other seller's order `6ad4758de66f6d06139b8c1a`. Its intent `pi_3URoWfJrMKRA89iL1luAtd5Z` became `canceled`; `amount_received=0`, `amount_capturable=0`. The order became cancelled/released, and the buyer saw Reservation released.
- An accelerated expiry of order `6ad47599e66f6d06139b8d7c` caused the running deadline scanner to cancel and release intent `pi_3URoWqJrMKRA89iL0passGL7`. Stripe confirmed `canceled` and zero received/capturable amounts; the buyer saw Reservation released.

Expiry was accelerated by moving this isolated local order's `acceptBy` into the past. This verifies the scanner and actual Stripe release; it is **not** a real 24-hour wait or an observed bank-side authorization expiration. Exact deadline rules are covered separately by backend integration tests. Webhook delivery was not exercised in this run.

The four checkout-only authorizations remain as test-mode pending examples. They have not been accepted; their local acceptance deadlines will release them if the API remains running.

Read-only Stripe evidence is stored in the ignored file `backend/test-results/local-payment-verification/stripe-evidence.json`. It includes order/intent IDs and amounts, with no credentials or client secrets.

## Android emulator: passed

An Android emulator is available. The old Patrol checkout helpers target the legacy card form, so a new saved-card/multiple-seller verification test and stable payment-control keys were prepared. The test bootstrap can initialize the real Stripe plugin when requested.

The user subsequently approved the Patrol runner. Initial attempts stopped before tests because Java's Windows socket transport failed and the sandbox blocked Patrol's signal handler. A process-only Java setting and an approved runner outside the sandbox allowed the Android build and test to run; no global Java or app configuration was changed.

The Android saved-card/two-seller checkout test passed. Orders `6ad47918e66f6d06139b8fc3` and `6ad47918e66f6d06139b8fc4` each had `paymentStatus=authorized`. Direct Stripe inspection confirmed both intents had `livemode=false`, `capture_method=manual`, `status=requires_capture`, `amount_capturable=2160`, and `amount_received=0`.

The first UI attempt identified missing test keys on the existing checkout payment-method controls. Those keys were added; payment behavior was unchanged. A separate native-form inspection identified Stripe's actual Android card fields before writing new-card interactions.

The actual native Stripe new-card checkout also passed using test card 4242. Order `6ad47ac0e66f6d06139b9170` / intent `pi_3URos7JrMKRA89iL13sWh8w4` initially had `requires_capture`, `amount_capturable=2160`, and `amount_received=0`. Native entry uses the inspected Stripe resource IDs with Patrol's alternative keyboard mode; its default keyboard-dismiss action navigated away from the form on this emulator.

The two Android settlement tests passed:

- Seller `s1` accepted mobile order `6ad47918e66f6d06139b8fc4` through the dashboard. Stripe intent `pi_3URolIJrMKRA89iL1HBAwRKv` became `succeeded`, received 2160, and had zero capturable. The buyer saw Payment charged.
- The buyer cancelled mobile order `6ad47918e66f6d06139b8fc3` through the order detail and confirmation dialog. Stripe intent `pi_3URolHJrMKRA89iL0f8eLWEC` became `canceled`, with zero received and capturable. The buyer saw Reservation released.
- The native new-card order's deadline was accelerated using the isolated helper. The running scanner released intent `pi_3URos7JrMKRA89iL13sWh8w4`; Stripe confirmed `canceled`, zero received/capturable, and the Android buyer saw Reservation released.

Every inspected Android intent was test mode and manual capture. These are emulator results, not physical-device or iOS verification. The expiry qualification and untested webhook-delivery limitation above apply to Android too.

Final checks: mobile analysis reported no issues. The web expiry case passed again after adding the isolated web-origin guard (2 passed including authentication setup); order `6ad47c67e66f6d06139b9352` / intent `pi_3URoywJrMKRA89iL16iyjYJe` was cancelled/released with zero received/capturable in Stripe. The generated mobile runner has no content diff from HEAD. No changes were committed or pushed.

The verification tests are opt-in using `--dart-define=LOCAL_PAYMENT_VERIFICATION=true` and reject an API other than the isolated emulator endpoint. Stripe-initializing tests also reject publishable keys without the `pk_test_` prefix. No payment business logic was changed during this verification; app changes add test keys and test bootstrap support.

The mobile cases share fixture login/cart setup, authorization checks, and capture
polling through `patrol_test/modules/local_payment_api.dart`. UI actions remain in
the individual test files, and API clients close even on failures. The address
helper explicitly selects New Address before entering fields, so the cases also
work when the test buyer already has a saved address. Generated runner changes
are restored after a verification run; the checked-in integration entrypoint still
imports the baseline runner.

### Cleanup regression check (2026-10-18)

After extracting the shared mobile helper, Android new-card and saved-card
checkout passed, followed by both acceptance/cancellation settlement cases.
The web settlement and expiry suite passed (3 tests including authentication).
A final Android saved-card checkout passed with both fixture products on page
two of the catalog and a saved address already present. Fixture lookup now
follows catalog pagination instead of assuming the products are on page one.

Direct Stripe test-mode inspection confirmed captured accepted orders
`6ad491ef880452fa06b44b80` (Android) and `6ad492d3880452fa06b44f21` (web).
Cancelled orders `6ad491ef880452fa06b44b7f` and `6ad492d3880452fa06b44f22`,
and accelerated-expiry orders `6ad491dd880452fa06b44a62` and
`6ad492df880452fa06b45161`, had zero received and capturable amounts.
The final Android checkout orders `6ad49351880452fa06b45338` and
`6ad49351880452fa06b45339` remained `requires_capture` with zero received.
All eight inspected intents used manual capture and had `livemode=false`.
Expiry remains accelerated local verification, not a real 24-hour wait.

One Android runner startup needed its notification permission granted before
the test app could launch; subsequent runs started normally. This cleanup
changes test setup, selectors, and readability, not payment business rules.

## Repeating the web checks

From `e2e-testing`, with the verification web/API processes already running:

```powershell
$env:API_URL='http://127.0.0.1:5001'
$env:WEB_URL='http://localhost:5173'
$env:CHECKOUT_FLOW='manual_capture'
npx playwright test tests/web/buyer/card-checkout-authorization.spec.ts --project=web-buyer --grep 'TC-AUTH-0[123]:' --workers=1
$env:LOCAL_PAYMENT_VERIFICATION='true'
npx playwright test tests/web/buyer/local-payment-settlement.spec.ts --project=web-buyer --workers=1
```

From `backend`, refresh Stripe evidence with `node --import tsx scripts/local-payment-evidence.mjs`. This helper intentionally targets only the isolated local database and requires a Stripe test key. Its `expire ORDER_ID` mode only moves the deadline of a pending authorized manual-capture order in that database; it does not change global deadlines.

## Repeating Android checks

Use the running `emulator-5554` and the same isolated backend. Run these Patrol targets from `frontend-mobile` with `API_BASE_URL=http://10.0.2.2:5001/api`, `BASE_URL=http://10.0.2.2:5001`, `CHECKOUT_FLOW=manual_capture`, and `LOCAL_PAYMENT_VERIFICATION=true` as Dart defines:

- `patrol_test/2_buyer/manual_capture_saved_card_verification_test.dart`: creates fresh orders for both fixture sellers using the saved test card and prints their order/intent IDs.
- `patrol_test/2_buyer/manual_capture_new_card_verification_test.dart`: creates a fresh native new-card authorization and prints its IDs. Inspect Stripe before expiring it with the helper.
- `patrol_test/2_buyer/local_payment_settlement_test.dart`: requires explicit fresh `LOCAL_ACCEPT_ORDER_ID` (seller s1), `LOCAL_CANCEL_ORDER_ID` (the other seller), and `LOCAL_EXPIRED_ORDER_ID` (the accelerated-expiry order). These are one-time mutation fixtures; create new orders when repeating the settlement suite.

On this Windows setup the runner used the Dart executable directly, JDK `C:/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot`, and a process-only `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=D:/Files/Automation/shopping-app-automation/frontend-mobile/.dart_tool/local-payment-verification/unused-socket-directory`. That final path must remain nonexistent to let Java fall back to TCP loopback. The sandbox required an approved external runner for the process signal handler and SDK cache. Generated `patrol_test/test_bundle.dart` changes are excluded from the final work.
