import 'package:flutter/widgets.dart';

class _WidgetKey extends ValueKey<String> {
  const _WidgetKey(String value) : super('widget_$value');
}

class WidgetKeys {
  final dialogCancelButton = const _WidgetKey('dialogCancelButton');
  final dialogConfirmButton = const _WidgetKey('dialogConfirmButton');
}
