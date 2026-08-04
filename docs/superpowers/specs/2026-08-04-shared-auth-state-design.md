# Shared Auth State for Playwright Tests

**Date:** 2026-08-04  
**Status:** Approved  
**Scope:** `e2e-testing/` — Playwright web test suite

---

## Problem

Every buyer test currently calls `loginPage.loginAsBuyer()` inline, making a full UI login for every single test run. The seller setup already solves this for seller tests using a setup project + `storageState`, but buyer tests have no equivalent. Mixed-role tests (seller creates → buyer purchases) have no pattern at all.

---

## Goal

- Login executes **once per role per run**, regardless of how many tests or role switches follow.
- Tests in `buyer/` start as the buyer automatically — no login code in the test body.
- Tests in `seller/` start as the seller automatically.
- Tests in `mixed/` can switch between buyer and seller mid-test with a single fixture call, without making any API login request.

---

## Architecture

### Setup projects (run once per `npm test`)

| File | Saves | How |
|------|-------|-----|
| `tests/auth/buyer.setup.ts` | `.auth/buyer.json` | API login → inject localStorage → save storageState |
| `tests/auth/seller.setup.ts` | `.auth/seller.json` | API login → promote to seller → inject localStorage → save storageState |

`seller.setup.ts` already exists and works. `buyer.setup.ts` mirrors it without the role-promotion step.

### Playwright projects (`playwright.config.ts`)

| Project | Depends on | Default `storageState` | Matches |
|---------|-----------|------------------------|---------|
| `buyer-setup` | — | — | `tests/auth/buyer.setup.ts` |
| `seller-setup` | — | — | `tests/auth/seller.setup.ts` |
| `web-buyer` | `buyer-setup` | `.auth/buyer.json` | `tests/web/buyer/**` |
| `web-seller` | `seller-setup` | `.auth/seller.json` | `tests/web/seller/**` |
| `web-mixed` | `buyer-setup`, `seller-setup` | _(none)_ | `tests/web/mixed/**` |
| `api` | — | — | `*.api.spec.ts` |

### Test folder layout

```
e2e-testing/tests/
  auth/
    buyer.setup.ts
    seller.setup.ts
  web/
    buyer/           ← buyer tests; auto-authenticated on start
    seller/          ← seller tests; auto-authenticated on start
    mixed/           ← cross-role tests; use switchRole() to change auth
  api/
    *.api.spec.ts
```

Existing web tests are relocated:

| Current path | New path |
|---|---|
| `tests/web/login.spec.ts` | `tests/web/buyer/login.spec.ts` |
| `tests/web/checkout.spec.ts` | `tests/web/buyer/checkout.spec.ts` |
| `tests/web/seller-product-wizard.spec.ts` | `tests/web/seller/seller-product-wizard.spec.ts` |

### `switchRole` fixture

A fixture added to `base-fixture.ts` that reads from an already-saved auth JSON file and injects its `localStorage` entries into the current page, then reloads so the app picks up the new session.

```typescript
// Signature
switchRole: (role: 'buyer' | 'seller') => Promise<void>

// Usage in a mixed test
await switchRole('seller');
// ... seller creates product ...
await switchRole('buyer');
// ... buyer finds and purchases it ...
```

Implementation reads `.auth/buyer.json` or `.auth/seller.json` from disk (already written by setup), extracts the `origins[0].localStorage` array, calls `page.evaluate()` to write those entries, then calls `page.reload()`. No network request is made.

### Buyer test body cleanup

Because `web-buyer` starts with `.auth/buyer.json` already loaded, tests in `buyer/` remove their manual `loginPage.goto()` / `loginAsBuyer()` calls. The session is already active when the test body begins.

`login.spec.ts` is an exception — it intentionally tests the login form and keeps the login steps.

---

## File changes summary

| File | Action |
|------|--------|
| `tests/auth/buyer.setup.ts` | **Create** |
| `playwright.config.ts` | **Update** — add `buyer-setup`, `web-buyer`, `web-seller`, `web-mixed` projects; remove old `web` project |
| `fixtures/base-fixture.ts` | **Update** — add `switchRole` fixture |
| `tests/web/buyer/login.spec.ts` | **Move** from `tests/web/login.spec.ts` |
| `tests/web/buyer/checkout.spec.ts` | **Move + update** — remove manual login steps |
| `tests/web/seller/seller-product-wizard.spec.ts` | **Move** from `tests/web/seller-product-wizard.spec.ts` |

---

## Auth state files

`.auth/buyer.json` and `.auth/seller.json` are git-ignored (contain auth tokens). The `.auth/` directory is created at runtime by the setup projects.

---

## Constraints

- `switchRole` always reloads the page — tests in `mixed/` must not rely on in-memory UI state across a role switch.
- Setup projects are serial (not parallel with each other or with tests).
- The `api` project has no dependency on setup projects and no default `storageState`.
