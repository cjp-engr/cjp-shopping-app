import 'package:patrol/patrol.dart';
import 'package:toko_mart/app.dart';
import 'package:toko_mart/shared/services/storage_service.dart';
import 'package:toko_mart/test_keys.dart';

void main() {
  patrolTest(
    'logs in and verifies the home screen',
    ($) async {
      final storage = await StorageService.init();

      await $.pumpWidgetAndSettle(
        TokoMart(storageService: storage),
      );

      // ── Actions ─────────────────────────────────────────────────────────────

      await $(AppKeys.loginEmailField).enterText('hello@world.com');
      await $(AppKeys.loginPasswordField).enterText('Test750!!');
      await $(AppKeys.loginButton).tap();

      // ── Assertions ──────────────────────────────────────────────────────────

      await $(AppKeys.homeScreen).waitUntilVisible();
      await $(AppKeys.homeSearchField).waitUntilVisible();
    },
  );
}
