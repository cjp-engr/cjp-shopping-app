import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

class StripeConfig {
  static Future<void> initialize() async {
    final publishableKey = dotenv.env['STRIPE_PUBLISHABLE_KEY'];

    if (publishableKey == null) {
      throw Exception('STRIPE_PUBLISHABLE_KEY not found in environment');
    }

    if (publishableKey.isEmpty) {
      throw Exception('STRIPE_PUBLISHABLE_KEY is empty');
    }

    if (!publishableKey.startsWith('pk_')) {
      throw Exception(
        'STRIPE_PUBLISHABLE_KEY must be a publishable key (starts with pk_), not a secret key',
      );
    }

    Stripe.publishableKey = publishableKey;
    await Stripe.instance.applySettings();
  }
}
