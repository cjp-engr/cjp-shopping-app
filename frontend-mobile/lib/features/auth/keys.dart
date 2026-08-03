import 'package:flutter/widgets.dart';

class _AuthKey extends ValueKey<String> {
  const _AuthKey(String value) : super('auth_$value');
}

class AuthKeys {
  final loginButton = const _AuthKey('loginButton');
  final loginEmailField = const _AuthKey('loginEmailField');
  final loginPasswordField = const _AuthKey('loginPasswordField');
  final loginSignUpLink = const _AuthKey('loginSignUpLink');
  final signupButton = const _AuthKey('signupButton');
  final signupConfirmPasswordField =
      const _AuthKey('signupConfirmPasswordField');
  final signupEmailField = const _AuthKey('signupEmailField');
  final signupFirstNameField = const _AuthKey('signupFirstNameField');
  final signupLastNameField = const _AuthKey('signupLastNameField');
  final signupPasswordField = const _AuthKey('signupPasswordField');
  final signupSignInLink = const _AuthKey('signupSignInLink');
}
