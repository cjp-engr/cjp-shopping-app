import 'package:patrol/patrol.dart';
import 'package:toko_mart/shared/services/storage_service.dart';

import 'package:toko_mart/app.dart';

class CommonActions {
  final PatrolIntegrationTester t;

  CommonActions(this.t);

  Future<void> initializeApp() async {
    final storage = await StorageService.init();
    await t.pumpWidgetAndSettle(
      TokoMart(storageService: storage),
    );
  }
}
