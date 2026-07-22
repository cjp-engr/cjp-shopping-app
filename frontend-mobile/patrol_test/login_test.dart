import 'package:patrol/patrol.dart';

import 'common_actions.dart';
import 'pages/login_test_page.dart';

void main() {
  patrolTest(
    'logs in and verifies the home screen',
    ($) async {
      await _initializeApp($);
      await _loginuser($);
    },
  );
}

Future<void> _initializeApp(PatrolIntegrationTester $) async {
  CommonActions action = CommonActions($);
  await action.initializeApp();
}

Future<void> _loginuser(PatrolIntegrationTester $) async {
  LoginTestPage login = LoginTestPage($);
  await login.loginWithEmail();
}
