// TC coverage: TC-068 (signup with valid data lands on home screen)

import 'package:toko_mart/keys.dart';

import '../test_app.dart';
import '../test_credentials.dart';

void main() {
  testApp('signs up with valid data and lands on home screen', tags: ['smoke'],
      ($, modules) async {
    final email = 'test+${DateTime.now().millisecondsSinceEpoch}@example.com';

    await modules.auth.navigateToSignup();
    await modules.auth.signup(
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: TestCredentials.password,
    );

    await $(keys.products.homeScreen).waitUntilVisible();
  });
}
