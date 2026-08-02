import 'dart:io';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../widgets/app_dialog.dart';
import '../../core/constants/app_colors.dart';

/// Handles runtime permission requests for camera and media (photos/videos).
/// Shows a rationale dialog before the system prompt, and a settings redirect
/// dialog if the user has permanently denied.
class MediaPermissionService {
  MediaPermissionService._();

  /// Request camera permission. Returns `true` if granted.
  static Future<bool> requestCamera(BuildContext context) async {
    return _request(
      context,
      permission: Permission.camera,
      icon: Icons.camera_alt_outlined,
      title: 'Camera Access',
      reason:
          'TokoMart needs camera access to let you take product photos directly.',
    );
  }

  /// Request photos/videos permission (gallery). Returns `true` if granted.
  static Future<bool> requestGallery(BuildContext context) {
    return _request(
      context,
      permission: Permission.photos,
      icon: Icons.photo_library_outlined,
      title: 'Photo & Video Access',
      reason:
          'TokoMart needs access to your photos and videos to let you upload product images.',
      // Android 13+ photo picker can work without READ_MEDIA_IMAGES once the
      // seller consents in our rationale dialog.
      allowAfterRationaleWithoutGrant: Platform.isAndroid,
    );
  }

  static Future<bool> _request(
    BuildContext context, {
    required Permission permission,
    required IconData icon,
    required String title,
    required String reason,
    bool allowAfterRationaleWithoutGrant = false,
  }) async {
    var status = await permission.status;

    if (_isEffectivelyGranted(status)) return true;

    if (status.isPermanentlyDenied || status.isRestricted) {
      return _promptOpenSettings(context, title: title);
    }

    if (!context.mounted) return false;
    final proceed = await _showRationale(
      context,
      icon: icon,
      title: title,
      reason: reason,
    );
    if (proceed != true) return false;

    status = await permission.request();
    if (_isEffectivelyGranted(status)) return true;

    if (allowAfterRationaleWithoutGrant) return true;

    if (status.isPermanentlyDenied || status.isRestricted) {
      return _promptOpenSettings(context, title: title);
    }

    return false;
  }

  static bool _isEffectivelyGranted(PermissionStatus status) {
    return status.isGranted || status.isLimited;
  }

  /// Shows rationale dialog; caller must await bottom sheet dismissal first.
  static Future<bool?> _showRationale(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String reason,
  }) async {
    if (!context.mounted) return false;
    return AppDialog.show(
      context,
      useRootNavigator: true,
      icon: icon,
      iconColor: AppColors.primary,
      iconBackground: AppColors.primaryLight,
      title: title,
      body: reason,
      cancelLabel: 'Not Now',
      confirmLabel: 'Allow Access',
    );
  }

  static Future<bool> _promptOpenSettings(
    BuildContext context, {
    required String title,
  }) async {
    if (!context.mounted) return false;
    final openSettings = await AppDialog.show(
      context,
      useRootNavigator: true,
      icon: Icons.settings_outlined,
      iconColor: AppColors.warning,
      iconBackground: AppColors.warningSurface,
      title: '$title Required',
      body:
          'Permission was denied. Please enable it in your device settings to continue.',
      cancelLabel: 'Cancel',
      confirmLabel: 'Open Settings',
      confirmColor: AppColors.warning,
    );
    if (openSettings == true) await openAppSettings();
    return false;
  }
}
