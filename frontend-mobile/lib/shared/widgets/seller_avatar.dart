import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class SellerAvatar extends StatelessWidget {
  final String? avatarUrl;
  final String name;
  final double size;

  const SellerAvatar({
    super.key,
    this.avatarUrl,
    required this.name,
    this.size = 40,
  });

  String get _initials {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '?';
    final parts = trimmed.split(' ').where((w) => w.isNotEmpty).toList();
    return parts.map((w) => w[0]).take(2).join().toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: (avatarUrl != null && avatarUrl!.isNotEmpty)
          ? ClipOval(
              child: Image.network(
                avatarUrl!,
                width: size,
                height: size,
                fit: BoxFit.cover,
                loadingBuilder: (_, child, progress) =>
                    progress == null ? child : _InitialsCircle(initials: _initials, size: size),
                errorBuilder: (_, __, ___) =>
                    _InitialsCircle(initials: _initials, size: size),
              ),
            )
          : _InitialsCircle(initials: _initials, size: size),
    );
  }
}

class _InitialsCircle extends StatelessWidget {
  final String initials;
  final double size;
  const _InitialsCircle({required this.initials, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        color: AppColors.primary,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.36,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
