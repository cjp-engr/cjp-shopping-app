# TokoMart: instructions for AI coding agents

These rules apply to every agent working in this repo (Claude Code, Codex, ChatGPT agents). The owner's explicit instructions in a session override this file.

## Project map

- `backend/`: Express + TypeScript + MongoDB (Mongoose, replica-set transactions), Stripe.
- `frontend/`: React + Vite web app.
- `frontend-mobile/`: Flutter app (BLoC).
- `e2e-testing/` (Playwright) and `frontend-mobile/patrol_test/` (Patrol): automation, see the first hard rule.
- `docs/superpowers/specs/` and `docs/superpowers/plans/`: designs and implementation plans (plans are local, gitignored). Open follow-ups for the authorize-capture payment feature: `docs/authorize-capture-open-items.md`.

## Hard rules

1. **Do not touch Playwright or Patrol.** Do not create, edit, run, or fix anything under `e2e-testing/` or `frontend-mobile/patrol_test/` (including `test_bundle.dart` and Patrol env/config). The owner writes and runs all automation after the app work is done. Skip every Playwright or Patrol step in a plan and say so in your final message. If you notice those folders were changed by someone else, report it; do not fix it.
2. **No commits, pushes, merges, branch changes, or deployments unless the owner asks in that session.** Leave work in the working tree. Do not run `git add`, `commit`, `stash`, `reset`, `checkout`, `clean`, or `rebase` on your own. Read-only git commands are fine. Earlier unfinished work is uncommitted in this tree: never revert or "clean up" changes you did not make.
3. **Never touch the owner's standalone MongoDB on port 27017** (it holds their dev data and is used from Compass). Backend integration tests run only against a database whose name ends in `_test` on a replica set, normally port 27018 (`tokomart-rs-test` container). Never run a destructive command (seed, delete, drop) against 27017.
4. **Never print, log, paste, or commit secrets**: `.env` values, API keys, tokens, passwords, client secrets. Read a variable's name or whether it is set, not its value.
5. **Stripe is test mode only.** No live keys, no real money. Tests must mock Stripe; manual checks use Stripe's published test cards only.
6. **Do not start, stop, or restart processes on ports 5000 and 5173** (the owner's dev backend and web app). Use other ports for your own servers and stop them when done.
7. **No destructive actions without confirmation**: deleting databases, containers, volumes, branches, or files you did not create.
8. **Change only the codebase, never the system.** Edit files inside this repo only. Do not change anything on the machine outside it: no OS or network settings, firewall or loopback rules, registry, environment variables, PATH or shell profiles, global or user-level installs (`npm -g`, `flutter pub global`, `dart pub global`, package managers), global git or tool config, Docker containers, images, volumes or networks you did not create, or other users' or the owner's files. Installing the project's own declared dependencies inside the repo (`npm install`, `flutter pub get`) and temporary files in a scratch or temp directory are fine. Set environment variables only for a single command, never persistently. If a task seems to need a system change (for example a Gradle or network fix, a new container, a global tool), do not do it yourself, even if it looks safe. Stop, explain what is needed and why, give the owner the exact steps, and let a human perform it. Continue only with the parts of the work that stay inside the codebase.

## How to work

- Read the relevant spec and plan before changing code. Do exactly what the task asks; do not add unrelated refactors, dependencies, or features.
- Match the surrounding code: naming, comment density, idiom. Backend uses ESM imports with `.js` extensions.
- Test first for logic and bug fixes. Finish a task only after the relevant tests, type-check, and lint pass; report real command output, not remembered results.
- Run the full test suites (backend, web, mobile) only when the owner asks. Until then run the type-check, lint, and only the test file you wrote or changed, and say in the final message that the full suites were not run. This narrows the line above: "the relevant tests" means that one file, not the full suites.
- Payment and order-state code must be safe under races and crashes: use the atomic claim pattern already in `backend/src/services/` (`orderAcceptance.ts`, `orderCancellation.ts`, `orderCapture.ts`), durable `PaymentOperation` records with stable idempotency keys, and never call Stripe inside a database transaction.
- When a plan or request leaves a choice open, pick the safest reasonable option and list your choices in the final message.

## Communicating with the owner

- Begin every reply with the owner's message corrected and improved: fix grammar, spelling, and word choice, and make the wording clearer, while keeping the original meaning, intent, and technical terms. Label it **Your message, improved** and keep it to one or two sentences.
- Add a short note on what changed only when it teaches something (for example tense, a missing article, or a verb form); skip the note for trivial fixes. If the message is already correct, say so in a few words.
- The correction never replaces or delays the real answer, and it never changes what the owner asked for: answer and act on the original request.
- Do not "correct" pasted content, code, commands, logs, file paths, or quoted text. Correct only the owner's own words.

## Feature inventory

- Maintain `docs/features.md` as a short, grouped index linking to a separate Markdown file for every feature. Store feature files under `docs/features/<area>/<feature-name>.md`, using lowercase hyphenated names (for example, `docs/features/refunds/delivered-item-refunds.md`). Update the feature file and its index link whenever a feature is added, changed, or removed; create missing documentation when doing that work.
- Group index links by feature area: Accounts & Profiles, Products & Catalog, Cart & Checkout, Payments, Orders & Delivery, Cancellations & Refunds, Seller Tools, and Reviews & Ratings. Add other sections only when supported by the code; these headings are organizational examples, not evidence that features exist.
- Keep one feature per file within its primary area. Identify buyer/seller roles and backend/web/mobile support in that file; cross-link shared features instead of duplicating their documentation or status across files. Keep detailed rules and status in the feature file, not in the index.
- In each feature file, record what it does, its main business rules, backend/web/mobile support, known limitations or remaining work, and relevant code or PR links.
- Track implementation, verification, enablement, and deployment separately. Implemented code does not prove a feature is tested, enabled, or deployed. Mark unknown status explicitly and record the date and branch/commit of verification when available.
- Before answering what features are implemented, read the index and relevant feature files, then verify the relevant code on the branch being discussed. Correct stale documentation; do not use plans or previous chat claims as proof of implementation.
- If the inventory is missing, say so and inspect the relevant code rather than inventing feature status. Do not claim checks passed unless their results are available, or run full test suites merely to update the inventory; the owner's test-running rules above still apply.

## Commands (run from the repo root)

- Backend unit tests and type-check: `cd backend && npx vitest run && npx tsc --noEmit`
- Backend contract tests: `cd backend && npm run test:contracts`
- Backend integration tests (replica set only):
  `cd backend && TEST_MONGODB_URI='mongodb://localhost:27018/tokomart_integration_test?replicaSet=rs0&directConnection=true' npx vitest run --config vitest.integration.config.ts`
- Web: `cd frontend && npx tsc -b && npx eslint . && npx vitest run`
- Mobile (Flutter SDK at `D:\donotdelete\flutter\bin`, add it to `PATH`): `cd frontend-mobile && flutter analyze && flutter test`

## Local servers for manual testing

- The owner's dev stack: backend on 5000 and web on 5173, on the standalone MongoDB (27017), legacy checkout flow only.
- Manual-capture checkout needs a replica set. A separate stack uses backend 5055, web 5174, and database `tokomart_manual` on 27018 (seed it first with `MONGODB_URI` pointing there). Details are in `docs/authorize-capture-open-items.md`.
