# TokoMart E2E Testing (Playwright)

Web UI and API tests for TokoMart in one Playwright project.

| Folder | Type | Pattern |
|--------|------|---------|
| `tests/web/` | Browser E2E | `*.spec.ts` |
| `tests/api/` | HTTP API | `*.api.spec.ts` |

Mobile tests remain in `frontend-mobile/patrol_test/` (Patrol).

## Prerequisites

```bash
cd backend && npm run seed && npm run dev   # :5000
cd frontend && npm run dev                  # :5173 (web tests only)
```

## Setup

```bash
cd e2e-testing
cp .env.example .env
npm install
npx playwright install chromium
```

## Run

```bash
npm test              # all
npm run test:api      # API only (backend required)
npm run test:web      # web UI (backend + frontend required)
npm run test:ui       # interactive UI mode
npm run report        # open HTML report
```

## QA pipeline

```
/create-scenarios → /test-strategy → /generate-tests → /review-tests
```

| Stage | Output |
|-------|--------|
| create-scenarios | `docs/test-cases/test-scenarios*.md` |
| test-strategy | `docs/test-strategies/test-strategy*.md` |

Generated tests land here; map each file to `TC-*` IDs in comments.
