import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ── Brand — Sky Blue (matches web primary-500/600) ────────────────────────
  static const Color primary = Color(0xFF0284C7);      // sky-600
  static const Color primaryLight = Color(0xFFE0F2FE); // sky-100
  static const Color primaryDark = Color(0xFF0369A1);  // sky-700
  static const Color accent = Color(0xFF8B5CF6);        // violet-500 (web secondary)

  // ── Semantic ─────────────────────────────────────────────────────────────
  static const Color success = Color(0xFF10B981);
  static const Color successSurface = Color(0xFFECFDF5);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningSurface = Color(0xFFFFFBEB);
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerSurface = Color(0xFFFEF2F2);

  // ── Light Surfaces (matches web gray scale) ───────────────────────────────
  static const Color background = Color(0xFFF9FAFB);   // gray-50
  static const Color surface = Color(0xFFFFFFFF);       // white
  static const Color surfaceVariant = Color(0xFFF3F4F6); // gray-100
  static const Color surfaceCard = Color(0xFFFFFFFF);   // white
  static const Color border = Color(0xFFE5E7EB);        // gray-200
  static const Color borderStrong = Color(0xFFD1D5DB);  // gray-300

  // ── Text (matches web gray scale) ────────────────────────────────────────
  static const Color textPrimary = Color(0xFF111827);   // gray-900
  static const Color textSecondary = Color(0xFF4B5563); // gray-600
  static const Color textMuted = Color(0xFF9CA3AF);     // gray-400

  // ── Dark CTA Button ───────────────────────────────────────────────────────
  static const Color darkButton = Color(0xFF0284C7);    // sky-600 (matches web)

  // ── Banner Gradient ───────────────────────────────────────────────────────
  static const Color bannerStart = Color(0xFF0369A1);   // sky-700
  static const Color bannerEnd = Color(0xFF075985);     // sky-800

  // ── Splash / Onboarding ───────────────────────────────────────────────────
  static const Color splashBg = Color(0xFF0C4A6E);      // sky-950

  // ── Shimmer ──────────────────────────────────────────────────────────────
  static const Color shimmerBase = Color(0xFFF3F4F6);   // gray-100
  static const Color shimmerHighlight = Color(0xFFF9FAFB); // gray-50
}
