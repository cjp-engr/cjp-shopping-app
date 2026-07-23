import 'package:toko_mart/keys.dart';

import 'test_app.dart';

void main() {
  testApp('logs in and verifies the home screen', ($, modules) async {
    await modules.auth.login(
      email: const String.fromEnvironment('EMAIL'),
      password: const String.fromEnvironment('PASSWORD'),
    );

    await $(keys.products.homeScreen).waitUntilVisible();
    await $(keys.products.searchField).waitUntilVisible();
  });
}
