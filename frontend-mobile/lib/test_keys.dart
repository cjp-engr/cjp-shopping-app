import 'package:flutter/foundation.dart';

/// Shared widget keys used by the app and Patrol tests.
/// Keys are only active in debug/test builds to avoid shipping key strings to production.
abstract class AppKeys {
  // ── Login screen ────────────────────────────────────────────────────────────
  static const loginButton = Key('loginButton');
  static const loginEmailField = Key('loginEmailField');
  static const loginPasswordField = Key('loginPasswordField');

  // ── Home screen (products) ──────────────────────────────────────────────────
  static const homeScreen = Key('homeScreen');
  static const homeSearchField = Key('homeSearchField');
}
