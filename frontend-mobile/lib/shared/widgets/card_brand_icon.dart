import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class CardBrandIcon extends StatelessWidget {
  final String brand;
  final double size;

  const CardBrandIcon({
    super.key,
    required this.brand,
    this.size = 32,
  });

  String _getIconPath(String brand) {
    final normalized = brand.toLowerCase().trim();
    if (normalized.contains('visa')) return 'assets/images/card_visa.svg';
    if (normalized.contains('mastercard')) return 'assets/images/card_mastercard.svg';
    if (normalized.contains('amex') || normalized.contains('american express')) {
      return 'assets/images/card_amex.svg';
    }
    if (normalized.contains('unionpay')) return 'assets/images/card_unionpay.svg';
    // Default fallback
    return 'assets/images/card_visa.svg';
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: SvgPicture.asset(
        _getIconPath(brand),
        fit: BoxFit.contain,
      ),
    );
  }
}
