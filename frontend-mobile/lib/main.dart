import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'shared/services/storage_service.dart';
import 'shared/services/notification_service.dart';
import 'core/config/stripe_config.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await dotenv.load(fileName: '.env');
  await StripeConfig.initialize();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  final storage = await StorageService.init();
  await NotificationService.instance.init();

  runApp(TokoMart(storageService: storage));
}
