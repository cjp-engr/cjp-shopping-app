import 'package:flutter/material.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/theme/theme_colors.dart';
import '../data/refund_models.dart';

class RefundSurface extends StatelessWidget {
  final Widget child;
  const RefundSurface({super.key, required this.child});
  @override
  Widget build(BuildContext context) => Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      color: context.surfaceColor,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: context.borderColor)),
      child: Padding(padding: const EdgeInsets.all(20), child: child));
}

/// 56px product image for refund rows, with a placeholder when there is no image or it fails to load.
class RefundItemImage extends StatelessWidget {
  final String? image;
  const RefundItemImage({super.key, this.image});
  @override
  Widget build(BuildContext context) {
    final fallback = Container(
        color: context.surfaceVariantColor,
        alignment: Alignment.center,
        child: Icon(Icons.inventory_2_outlined,
            size: 22, color: context.onSurfaceSecondary));
    return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
            width: 56,
            height: 56,
            child: image == null || image!.isEmpty
                ? fallback
                : Image.network(image!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => fallback)));
  }
}

class RefundBreakdown extends StatelessWidget {
  final int amount, shipping;
  final int? tax;
  final String currency;
  const RefundBreakdown(
      {super.key,
      required this.amount,
      required this.shipping,
      required this.currency,
      this.tax});
  @override
  Widget build(BuildContext context) {
    // The label takes the free space and the amount keeps its own width at the right edge. (A
    // Flexible amount would split the space with the label and end up beside it instead.)
    Widget line(String label, int value) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              child: Text(label,
                  style: TextStyle(
                      fontSize: 13, color: context.onSurfaceSecondary))),
          const SizedBox(width: 12),
          Text(refundMoney(value, currency),
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        ]));
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      line(tax == null ? 'Items & original tax' : 'Items after discounts',
          amount - shipping - (tax ?? 0)),
      if (tax != null) line('Original tax', tax!),
      line('Shipping refund', shipping),
      Divider(color: context.borderColor),
      const SizedBox(height: 10),
      // Full width so the amount sits at the right edge; wraps under the label when text is very large.
      SizedBox(
          width: double.infinity,
          child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 12,
              runSpacing: 4,
              children: [
                // The type of the Order Total row on the order screen.
                const Text('Refund total',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                Text(refundMoney(amount, currency),
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w900)),
              ]))
    ]);
  }
}

class RefundPolicy extends StatelessWidget {
  final DateTime? deliveredAt;
  const RefundPolicy({super.key, this.deliveredAt});

  static const _rules = [
    'Request within seven days of recorded delivery.',
    'Seller approval starts the refund. No return is needed.',
    'Shipping is refunded only when every paid item is refunded for a seller-fault reason.',
    'Change of mind is only allowed while the order is pending.',
  ];

  @override
  Widget build(BuildContext context) => Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(AppSizes.radiusLg),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withAlpha(18),
              blurRadius: 16,
              offset: const Offset(0, 3)),
          BoxShadow(
              color: Colors.black.withAlpha(6),
              blurRadius: 4,
              offset: const Offset(0, 1)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      // The default tile draws coloured divider lines above and below; the card needs none.
      child: Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
              shape: const Border(),
              collapsedShape: const Border(),
              tilePadding: const EdgeInsets.symmetric(
                  horizontal: AppSizes.md, vertical: 4),
              childrenPadding: const EdgeInsets.fromLTRB(
                  AppSizes.md, 0, AppSizes.md, AppSizes.md),
              expandedCrossAxisAlignment: CrossAxisAlignment.start,
              iconColor: context.onSurfaceSecondary,
              collapsedIconColor: context.onSurfaceSecondary,
              leading: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(30),
                      shape: BoxShape.circle),
                  child: Icon(Icons.policy_outlined,
                      size: 18,
                      color: context.isDark
                          ? Colors.orange.shade200
                          : Colors.brown.shade700)),
              title: Text('Refund policy & shipping',
                  style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: context.onSurfaceColor)),
              children: [
                for (final rule in _rules)
                  Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                                padding: const EdgeInsets.only(top: 2),
                                child: Icon(Icons.check_circle_outline,
                                    size: 16,
                                    color: context.onSurfaceSecondary)),
                            const SizedBox(width: 10),
                            Expanded(
                                child: Text(rule,
                                    style: TextStyle(
                                        fontSize: 13,
                                        height: 1.5,
                                        color: context.onSurfaceSecondary))),
                          ])),
                if (deliveredAt != null)
                  Container(
                      margin: const EdgeInsets.only(top: 2),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                          color: context.surfaceVariantColor,
                          borderRadius: BorderRadius.circular(8)),
                      child: Text('Delivered ${refundDate(deliveredAt)}',
                          style: TextStyle(
                              fontSize: 12,
                              color: context.onSurfaceSecondary))),
              ])));
}
