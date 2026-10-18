import 'package:patrol/patrol.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:toko_mart/core/config/stripe_config.dart';
import 'package:toko_mart/app.dart';
import 'package:toko_mart/shared/services/notification_service.dart';
import 'package:toko_mart/shared/services/storage_service.dart';

import 'modules/modules.dart';

void testApp(
  String description,
  Future<void> Function(PatrolIntegrationTester $, Modules modules) test, {
  List<String>? tags,
  bool initializeStripe = false,
}) {
  patrolTest(description, tags: tags, ($) async {
    if (initializeStripe) {
      await dotenv.load(fileName: '.env');
      if (!(dotenv.env['STRIPE_PUBLISHABLE_KEY'] ?? '')
          .startsWith('pk_test_')) {
        throw StateError(
            'Local payment verification requires a Stripe test publishable key');
      }
      await StripeConfig.initialize();
    }
    final storage = await StorageService.init();
    await storage.clear();

    // Initialise the notification plugin so MainShell doesn't throw when it
    // calls requestPermissions() during widget pump.
    await NotificationService.instance.init();

    await $.pumpWidgetAndSettle(
      TokoMart(storageService: storage),
      // Give extra time for the 2-second startup delay in MainShell to settle.
      timeout: const Duration(seconds: 15),
    );

    final modules = Modules($);
    await test($, modules);
  });
}
