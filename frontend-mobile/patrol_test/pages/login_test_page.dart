import 'package:patrol/patrol.dart';
import 'package:toko_mart/test_keys.dart';

class LoginTestPage {
  final PatrolIntegrationTester t;

  LoginTestPage(this.t);

  Future<void> loginWithEmail() async {
    // ── Actions ─────────────────────────────────────────────────────────────

    await t(AppKeys.loginEmailField)
        .enterText(const String.fromEnvironment('EMAIL'));
    await t(AppKeys.loginPasswordField)
        .enterText(const String.fromEnvironment('PASSWORD'));
    await t(AppKeys.loginButton).tap();

    // ── Assertions ──────────────────────────────────────────────────────────

    await t(AppKeys.homeScreen).waitUntilVisible();
    await t(AppKeys.homeSearchField).waitUntilVisible();
  }
}
