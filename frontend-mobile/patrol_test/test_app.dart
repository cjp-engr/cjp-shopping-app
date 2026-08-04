import 'package:patrol/patrol.dart';
import 'package:toko_mart/app.dart';
import 'package:toko_mart/shared/services/notification_service.dart';
import 'package:toko_mart/shared/services/storage_service.dart';

import 'modules/modules.dart';

void testApp(
  String description,
  Future<void> Function(PatrolIntegrationTester $, Modules modules) test, {
  List<dynamic>? tags,
}) {
  patrolTest(description, tags: tags, ($) async {
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
