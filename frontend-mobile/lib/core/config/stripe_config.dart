import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

class StripeConfig {
  static Future<void> initialize() async {
    final publishableKey = dotenv.env['STRIPE_PUBLISHABLE_KEY'];
    if (publishableKey == null) {
      throw Exception('STRIPE_PUBLISHABLE_KEY not found in environment');
    }

    Stripe.publishableKey = publishableKey;
    await Stripe.instance.applySettings();
  }
}
