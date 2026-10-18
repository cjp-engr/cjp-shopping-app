# Staging deployment

Use separate staging and production databases and Stripe credentials. For the first
deployment, run one always-on backend instance with MongoDB Atlas and the existing
Cloudinary upload integration. Deploy web and backend before distributing mobile builds.

For authorization at checkout and capture on seller preparation, follow the
[payment rollout runbook](payment-rollout.md) for flags, always-on recovery loops,
enablement gates, monitoring, and rollback. Local verification has passed; hosted
enablement requires the runbook's remaining deployment checks.

## Backend

Use `backend` as the hosting root directory. Install with `npm ci --legacy-peer-deps`
(the same dependency installation used by CI), build with `npm run build`, and start
with `npm start`. Pin a Node version compatible with the lockfile and the web build;
Node 22.12 or newer in the Node 22 line is a suitable starting point. Use `/health`
as a process health check. It is not a database readiness probe after startup.

Set these variables in the hosting dashboard, never in a committed secret file:

| Variable | Staging value |
| --- | --- |
| `NODE_ENV` | `production` (also for hosted staging) |
| `MONGODB_URI` | Staging Atlas connection string |
| `JWT_SECRET` | Strong randomly generated secret, unique to staging |
| `JWT_EXPIRES_IN` | `7d`, or your chosen session lifetime |
| `CORS_ORIGIN` | Exact web origin, e.g. `https://staging.example.com`, without a trailing slash |
| `TRUST_PROXY_HOPS` | Verified count of proxies in front of the API; `0` for direct access |
| `RATE_LIMIT_AUTH_MAX` | `10` auth requests per IP per minute (default) |
| `RATE_LIMIT_API_MAX` | `100` general API requests per IP per minute (default) |
| `AUTO_COMPLETE_ORDERS_ENABLED` | `true` on the single job-running instance |
| `STRIPE_SECRET_KEY` | Staging `sk_test_...` key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this hosted webhook endpoint |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

Allow the backend's outbound addresses in Atlas network access. The host supplies
`PORT`; do not hardcode it. Swagger documentation is disabled in production mode.

Register `https://your-api-host/api/payments/webhook` with Stripe for
`payment_intent.succeeded`, `payment_intent.payment_failed`,
`payment_intent.amount_capturable_updated`, and `payment_intent.canceled`. A local Stripe CLI
signing secret is different from the hosted endpoint's secret.

### Proxy and rate limiting

The default trusts no forwarded client IP headers. Set `TRUST_PROXY_HOPS` only after
confirming the hosting topology. For a single reverse proxy this is `1`; additional
CDNs or gateways may change the count. Ensure clients cannot reach the server through
a shorter path and that the edge proxy replaces untrusted forwarding headers.
Do not enable blanket proxy trust. Verify separate clients are rate-limited separately
on the actual host. See [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/).

Rate limits currently use per-process memory. This staging setup assumes one instance;
before scaling out, use a shared rate-limit store or gateway limiter. Limits reset when
the process restarts.
`0` disables the corresponding limiter for testing; retain positive limits on hosted
staging and production. Payment routes are currently outside these two limiters.

### Order job

The job runs at startup, then hourly, and changes eligible shipped orders to delivered
after two days. Refund-requested orders are excluded. A pending run prevents another
run in the same process. The database filter prevents repeatedly completing an order.

Set `AUTO_COMPLETE_ORDERS_ENABLED=false` on other API instances if you add any. The
process must stay running for hourly scheduling; when it restarts, it catches up on
overdue orders. Before scaling or using sleeping/serverless hosting, move scheduling
to a dedicated worker or platform scheduler. This switch does not provide a distributed
lock. Wait for an in-flight update to finish before changing which instance owns the job.

## Web

Use `frontend` as the deployment root, `npm ci` to install, `npm run build` to build,
and `dist` as the output directory. Configure these variables before building:

```env
VITE_API_BASE_URL=https://your-api-host/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_staging_key
```

Vite embeds these values in the browser bundle; rebuild when they change. Keep all
backend secrets out of `VITE_` variables. Configure your static host's SPA fallback
to `index.html` so direct navigation and refresh work on product and order routes.
See [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite).

## Mobile

Copy `frontend-mobile/.env.example` to `.env` and supply the matching staging Stripe
publishable key. This asset is readable by app users: it must contain public values only.
Set the API URL using a Dart compile-time declaration, not by editing source:

```bash
flutter run --dart-define=API_BASE_URL=https://your-api-host/api
flutter build apk --release --dart-define=API_BASE_URL=https://your-api-host/api
flutter build appbundle --release --dart-define=API_BASE_URL=https://your-api-host/api
```

Release startup rejects missing configuration, HTTP URLs, and known emulator or loopback
addresses. Debug builds keep the Android emulator default if no URL is supplied. The URL
must end in `/api` and contain no credentials, query, or fragment. Rebuild to change it.
See [Dart environment declarations](https://dart.dev/libraries/core/environment-declarations).

Android signing and iOS signing/store preparation are separate release steps. iOS
builds require macOS and Xcode. Never place signing credentials in these public assets.

## Verification before production

Run backend tests/build, web lint/build, and Flutter tests/analyzer. On staging, verify
signup/login, product upload, seller product creation, cart, COD checkout, Stripe test
checkout, webhook delivery, and order history from both web and a physical phone.
Refresh a nested web route and verify its page loads. Check that API rate limits distinguish
clients behind the actual proxy. Confirm image URLs remain available after redeployment.

Keep test accounts and sample data in staging. Do not run the development seed against
production. Before accepting real orders, configure production credentials, database
backups, error monitoring, and a rollback procedure.
