# TokoMart Mobile E2E Tests (Patrol)

Patrol tests for the TokoMart Flutter mobile app.

## Prerequisites

- Flutter SDK installed
- Patrol CLI installed (`dart pub global activate patrol_cli`)
- Android emulator or physical device connected (`adb devices`)
- Backend running on `:5000` with seed data

```bash
cd backend && npm run seed && npm run dev
```

## Run

Single test:
```bash
cd frontend-mobile
patrol test --target patrol_test/<folder>/<file>_test.dart
```

All tests:
```bash
cd frontend-mobile
patrol test
```

With explicit credentials (if not set in `test_credentials.dart`):
```bash
patrol test --target patrol_test/0_auth/login_test.dart \
  --dart-define=EMAIL=test@example.com \
  --dart-define=PASSWORD=password123
```

## Structure

```
patrol_test/
├── test_app.dart           # testApp() wrapper — required by all tests
├── test_credentials.dart   # seed account credentials
├── test_bundle.dart        # imports all tests for full suite run
├── modules/
│   ├── module.dart         # base Module class
│   ├── modules.dart        # Modules aggregator
│   └── auth.dart           # Auth module (login, signup)
├── 0_auth/                 # Authentication tests
├── 1_seller/               # Seller flow tests
└── 2_buyer/                # Buyer flow tests
```

## Test coverage

### 0_auth — Authentication

| File | TC ID | Description |
|------|-------|-------------|
| `login_test.dart` | — | Logs in with seeded buyer account, verifies home screen |
| `signup_test.dart` | — | Signs up with valid data, lands on home screen |

### 1_seller — Seller Flows

| File | TC ID | Description |
|------|-------|-------------|
| `add_product_simple_test.dart` | TC-090 | Seller creates a simple product via 7-step wizard |
| `add_product_variant_test.dart` | TC-091 | Seller creates a variant product via 7-step wizard |

### 2_buyer — Buyer Checkout Flows

| File | TC ID | Description |
|------|-------|-------------|
| `simple_cod_checkout_test.dart` | TC-095 | Buyer places COD order (simple product) |
| `simple_saved_credit_checkout_test.dart` | TC-096 | Buyer checks out with saved credit card (simple product) |
| `simple_new_credit_checkout_test.dart` | TC-097 | Buyer checks out with new card entry (simple product) |
| `variant_cod_checkout_test.dart` | TC-101 | Buyer places COD order with variant product |
| `variant_new_credit_checkout_test.dart` | TC-103 | Buyer checks out with new card entry (variant product) |
| `variant_saved_credit_checkout_test.dart` | TC-104 | Buyer checks out with saved credit card (variant product) |

## Architecture

Each test file contains exactly one `testApp()` call. Test actions are written directly in the test file first, then extracted into modules after the test passes. See `modules/` for reusable flows.

- **Auth flows** → `modules/auth.dart`
- **Native interactions** → `$.platform` APIs (not `flutter_test`)
- **Widget locators** → `keys.*` from `lib/keys.dart` (never hardcoded strings)

Full architecture guide: `.claude/skills/patrol-test-architecture/`
