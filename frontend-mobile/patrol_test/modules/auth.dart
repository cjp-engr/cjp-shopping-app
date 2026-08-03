import 'package:toko_mart/keys.dart';

import 'module.dart';

final class Auth extends Module {
  Auth(super.$);

  Future<void> login({
    required String email,
    required String password,
  }) async {
    await $.platform.mobile.grantPermissionWhenInUse();

    await $(keys.auth.loginEmailField).enterText(email);
    await $(keys.auth.loginPasswordField).enterText(password);
    await $(keys.auth.loginButton).tap();
  }

  Future<void> navigateToSignup() async {
    await $(keys.auth.loginSignUpLink).tap();
  }

  Future<void> signup({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
  }) async {
    await $.platform.mobile.grantPermissionWhenInUse();

    await $(keys.auth.signupFirstNameField).enterText(firstName);
    await $(keys.auth.signupLastNameField).enterText(lastName);
    await $(keys.auth.signupEmailField).enterText(email);
    await $(keys.auth.signupPasswordField).enterText(password);
    await $(keys.auth.signupConfirmPasswordField).enterText(password);
    await $(keys.auth.signupButton).tap();
  }
}
