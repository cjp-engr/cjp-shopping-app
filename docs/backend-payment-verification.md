# Backend payment verification

## Automated coverage

`backend/src/services/__tests__/backendPaymentFlow.integration.test.ts` connects checkout creation, authorization, finalization, acceptance/cancellation, and recovery using real MongoDB transactions. Production service functions are exercised directly. Tests cover:

- Per-seller payment isolation, concurrent duplicate acceptance, cancellation, cart removal, stock and coupon accounting.
- A placed order's deadline is the earlier of 24 hours after placement and Stripe's capture deadline minus five minutes. Acceptance at the exact cutoff is refused; concurrent scanners cancel only once. Acceptance just before the cutoff remains accepted afterwards.
- Unexpected early authorization cancellation racing acceptance and a webhook.
- Definitive capture rejection followed by a second acceptance generation, lost capture responses, simultaneous retry workers, and a failed database write after the provider has captured.
- Actual child-process death after capture, hold release, and legacy refund. The independent provider first changes its own state, then withholds its response; the child is killed with an unfinished operation in MongoDB. A new Node process reconnects and completes recovery without a duplicate capture/refund or restoring reservations twice.
- Persisted webhook processing replayed in a fresh process, and overdue-order catch-up after downtime for both ordinary 24-hour and shorter authorization windows.

The existing integration suites additionally cover checkout idempotency, multi-seller compensation, failed finalization, draft expiry, lease ownership/heartbeats, retry exhaustion, old idempotency keys, orphaned operations, duplicate webhook delivery, buyer ownership, and legacy reconciliation.

Stripe is simulated. Parent tests use a stateful provider fixture; fresh worker processes use a test-only loader pointing exclusively at a loopback HTTP server. Child processes have no Stripe key and use the guarded `TEST_MONGODB_URI`. These tests do not contact live Stripe or a deployed API. They verify payment-worker restart recovery, rather than restarting the whole Express application or the database host.

## Running locally

Use an isolated MongoDB replica set and a database whose name ends with `_test`. The test connector refuses other database names and standalone MongoDB. Do not point tests at a development or production database: suites remove their fixture documents and some temporarily change indexes.

From `backend` in PowerShell, for the existing local test replica set:

```powershell
$env:TEST_MONGODB_URI='mongodb://127.0.0.1:27018/tokomart_recovery_test?replicaSet=rs0'
npm test
npm run test:integration
npm run build
```

For a new disposable database with Docker, use Bash from `backend`:

```bash
bash scripts/start-integration-mongo.sh
export TEST_MONGODB_URI='mongodb://127.0.0.1:27017/tokomart_payment_test?replicaSet=rs0'
npm run test:integration
docker rm --force tokomart-integration-mongo
```

`TEST_MONGO_PORT` and `TEST_MONGO_CONTAINER` override the default local port/container name. The script uses `mongo:8.0`, binds only to loopback, creates no persistent volume, initializes `rs0`, and waits for a writable primary. It never removes an existing container to reuse a name. If initialization fails, inspect its logs and remove only the container created by that run.

## CI

The `Backend database integration tests` job in `.github/workflows/ci.yml` runs on the existing CI triggers: pull requests targeting `main`, and pushes to `main`. It installs backend dependencies with Node 20, starts the replica set, and runs **all** `*.integration.test.ts` suites. Files run serially because they share a disposable database; race tests deliberately run operations concurrently inside a test.

The job uploads a JUnit report as `backend-integration-results`, prints MongoDB logs on failure, and removes its container afterwards. The test database and provider fixtures need no repository secrets. Unit tests/build remain in the existing backend job. A successful local run does not establish that the hosted workflow has passed; that result becomes available after the changes are pushed and CI is triggered.

Before production rollout, still perform a Stripe **test-mode** checkout/capture/cancellation from web and a physical mobile device, and inspect the matching Stripe objects. Automated provider simulations cannot prove live payment-provider behavior, hosted scheduling, or bank processing times.

References for the database/CI setup: [MongoDB replica-set initialization](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/), [GitHub Actions container networking](https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers).
