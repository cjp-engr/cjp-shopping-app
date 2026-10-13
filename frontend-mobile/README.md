# TokoMart Mobile

Flutter mobile app for TokoMart, consuming the same Express/MongoDB backend.

## Architecture

Clean Architecture + BLoC state management:

```
lib/
├── main.dart                    # Entry point + DI wiring
├── app.dart                     # Root widget, MultiBlocProvider
├── core/
│   ├── constants/               # Colors, sizes, strings
│   ├── theme/                   # Material 3 theme
│   ├── errors/                  # Failure types
│   └── network/                 # Dio client + auth interceptor
├── features/
│   ├── auth/                    # Login, signup, profile update
│   │   ├── data/                # Remote datasource, models, repo impl
│   │   ├── domain/              # User entity, abstract repo
│   │   └── presentation/        # AuthBloc + screens
│   ├── products/                # Product list, detail, search, filter
│   ├── cart/                    # Local cart (BLoC only, no API)
│   └── orders/                  # Checkout, order history, cancel
├── shared/
│   ├── services/                # StorageService (SharedPreferences)
│   └── widgets/                 # AppButton, AppTextField, MainShell
└── routes/                      # GoRouter with auth guard
```

## Setup

```bash
cd frontend-mobile
flutter pub get
flutter run
```

**Android emulator**: API base URL is `http://10.0.2.2:5000/api`  
**iOS simulator**: Run with `--dart-define=API_BASE_URL=http://127.0.0.1:5000/api`.
**Real device**: Supply your machine's LAN IP with `--dart-define=API_BASE_URL=http://192.168.1.x:5000/api`.

Release builds require an explicit hosted HTTPS API URL ending in `/api`:

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com/api
```

Configuration is validated at startup. Missing URLs, HTTP URLs, and emulator/loopback hosts
are rejected in release mode. `.env` is bundled into the app and must contain only public
configuration such as the Stripe publishable key. See [the staging guide](../docs/deployment.md).

## State Management

Each feature has its own BLoC:

| BLoC | Purpose |
|------|---------|
| `AuthBloc` | Login, signup, session restore, profile update, logout |
| `ProductBloc` | Load products list, detail, categories |
| `CartBloc` | Local cart — add, remove, quantity change |
| `OrderBloc` | Place order, load history, cancel |

## Screens

| Route | Screen |
|-------|--------|
| `/login` | Login |
| `/signup` | Signup |
| `/` | Products list (with search + category filter) |
| `/products/:id` | Product detail |
| `/cart` | Cart |
| `/checkout` | Checkout + shipping form |
| `/orders` | Order history |
| `/profile` | Profile + edit |
