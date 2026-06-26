import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_sizes.dart';

class ImagePlaceholder extends StatelessWidget {
  final double size;
  const ImagePlaceholder({super.key, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.shimmerBase,
        borderRadius: BorderRadius.circular(AppSizes.radiusSm),
      ),
      child: Icon(Icons.image_outlined, size: size * 0.4, color: AppColors.textMuted),
    );
  }
}
