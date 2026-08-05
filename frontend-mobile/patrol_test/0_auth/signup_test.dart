import 'package:toko_mart/keys.dart';

import '../test_app.dart';

void main() {
  testApp('signs up with valid data and lands on home screen', tags: ['smoke'],
      ($, modules) async {
    final email = 'test+${DateTime.now().millisecondsSinceEpoch}@example.com';

    await modules.auth.navigateToSignup();
    await modules.auth.signup(
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: const String.fromEnvironment('PASSWORD'),
    );

    await $(keys.products.homeScreen).waitUntilVisible();
  });
}
