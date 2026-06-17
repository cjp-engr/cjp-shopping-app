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
**iOS simulator**: Change to `http://127.0.0.1:5000/api` in `lib/core/network/api_client.dart`  
**Real device**: Use your machine's LAN IP (e.g. `http://192.168.1.x:5000/api`)

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
