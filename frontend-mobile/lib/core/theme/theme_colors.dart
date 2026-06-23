import 'package:flutter/material.dart';

extension ThemeColors on BuildContext {
  ColorScheme get cs => Theme.of(this).colorScheme;
  bool get isDark => Theme.of(this).brightness == Brightness.dark;

  Color get bgColor => Theme.of(this).scaffoldBackgroundColor;
  Color get surfaceColor => cs.surface;
  Color get surfaceVariantColor => cs.surfaceContainerHighest;
  Color get cardColor => cs.surfaceContainerHighest;
  Color get onSurfaceColor => cs.onSurface;
  Color get onSurfaceSecondary => cs.onSurface.withAlpha(153); // ~60% opacity
  Color get onSurfaceMuted => cs.onSurface.withAlpha(102);     // ~40% opacity
  Color get borderColor => cs.outline.withAlpha(80);
}
