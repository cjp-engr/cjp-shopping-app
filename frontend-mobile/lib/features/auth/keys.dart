import 'package:flutter/widgets.dart';

class _AuthKey extends ValueKey<String> {
  const _AuthKey(String value) : super('auth_$value');
}

class AuthKeys {
  final loginButton = const _AuthKey('loginButton');
  final loginEmailField = const _AuthKey('loginEmailField');
  final loginPasswordField = const _AuthKey('loginPasswordField');
}
