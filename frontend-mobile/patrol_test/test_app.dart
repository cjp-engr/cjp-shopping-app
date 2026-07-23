import 'package:patrol/patrol.dart';
import 'package:toko_mart/app.dart';
import 'package:toko_mart/shared/services/storage_service.dart';

import 'modules/modules.dart';

void testApp(
  String description,
  Future<void> Function(PatrolIntegrationTester $, Modules modules) test,
) {
  patrolTest(description, ($) async {
    final storage = await StorageService.init();
    await $.pumpWidgetAndSettle(TokoMart(storageService: storage));

    final modules = Modules($);
    await test($, modules);
  });
}
