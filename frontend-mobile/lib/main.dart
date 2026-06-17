import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'shared/services/storage_service.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  final storage = await StorageService.init();

  runApp(TokoMart(storageService: storage));
}
