import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// One checkout attempt. Holds the idempotency key and session ID only, never a client secret or card data.
class CheckoutAttempt {
  const CheckoutAttempt({required this.idempotencyKey, this.sessionId});

  final String idempotencyKey;
  final String? sessionId;

  CheckoutAttempt withSessionId(String id) => CheckoutAttempt(idempotencyKey: idempotencyKey, sessionId: id);
}

/// Keeps the attempt across app restarts so a checkout can resume instead of starting again.
abstract class CheckoutAttemptStore {
  Future<CheckoutAttempt?> load(String buyerId);
  Future<void> save(String buyerId, CheckoutAttempt attempt);
  Future<void> clear(String buyerId);
}

class SharedPreferencesCheckoutAttemptStore implements CheckoutAttemptStore {
  const SharedPreferencesCheckoutAttemptStore();

  static String _key(String buyerId) => 'checkout-attempt:$buyerId';

  @override
  Future<CheckoutAttempt?> load(String buyerId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(buyerId));
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) return null;
      final key = decoded['idempotencyKey'];
      if (key is! String || key.isEmpty) return null;
      return CheckoutAttempt(idempotencyKey: key, sessionId: decoded['sessionId'] as String?);
    } catch (_) {
      // Unreadable storage: start a new attempt rather than fail the checkout.
      return null;
    }
  }

  @override
  Future<void> save(String buyerId, CheckoutAttempt attempt) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _key(buyerId),
        jsonEncode({'idempotencyKey': attempt.idempotencyKey, 'sessionId': attempt.sessionId}),
      );
    } catch (_) {
      // Storage unavailable: checkout still works; a restart would begin a new attempt.
    }
  }

  @override
  Future<void> clear(String buyerId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_key(buyerId));
    } catch (_) {
      // Nothing stored to clear.
    }
  }
}
