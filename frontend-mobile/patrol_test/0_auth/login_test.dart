// TC coverage: TC-067 (S2 — mobile login smoke)

import 'package:toko_mart/keys.dart';

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('logs in and verifies the home screen', tags: ['smoke'],
      ($, modules) async {
    await modules.auth.login(
      email: TestCredentials.sellerEmail,
      password: TestCredentials.password,
    );

    await $(keys.products.homeScreen).waitUntilVisible();
    await $(keys.products.searchField).waitUntilVisible();
  });
}
