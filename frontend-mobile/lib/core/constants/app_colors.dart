import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ── Brand — Trust Orange (matches web primary-500/600) ───────────────────
  static const Color primary = Color(0xFFFF9900);      // orange brand
  static const Color primaryLight = Color(0xFFFFF8F0); // warm white tint
  static const Color primaryDark = Color(0xFFFF6B00);  // CTA / active orange
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
  static const Color darkButton = Color(0xFFFF6B00);    // CTA orange (matches web primary-600)

  // ── Banner Gradient ───────────────────────────────────────────────────────
  static const Color bannerStart = Color(0xFF232F3E);   // dark navy (matches web primary-800)
  static const Color bannerEnd = Color(0xFF1A252F);     // deep navy (matches web primary-900)

  // ── Splash / Onboarding ───────────────────────────────────────────────────
  static const Color splashBg = Color(0xFF1A252F);      // deep navy

  // ── Shimmer ──────────────────────────────────────────────────────────────
  static const Color shimmerBase = Color(0xFFF3F4F6);      // gray-100
  static const Color shimmerHighlight = Color(0xFFF9FAFB); // gray-50

  // ── Sale / Discount ───────────────────────────────────────────────────────
  static const Color sale = Color(0xFFE31837);           // sale red
  static const Color saleSurface = Color(0xFFFFEBEE);   // sale red tint
}
