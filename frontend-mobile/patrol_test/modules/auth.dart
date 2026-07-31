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
}
