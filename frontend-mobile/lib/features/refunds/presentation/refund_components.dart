import 'package:flutter/material.dart';
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

class RefundProduct extends StatelessWidget {
  final String name, detail;
  final String? image;
  final Widget? child;
  const RefundProduct(
      {super.key,
      required this.name,
      required this.detail,
      this.image,
      this.child});
  @override
  Widget build(BuildContext context) {
    final fallback = Container(
        color: context.surfaceVariantColor,
        alignment: Alignment.center,
        child: Icon(Icons.inventory_2_outlined,
            color: context.onSurfaceSecondary));
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
              width: 64,
              height: 76,
              child: image == null || image!.isEmpty
                  ? fallback
                  : Image.network(image!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => fallback))),
      const SizedBox(width: 12),
      Expanded(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(name,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        const SizedBox(height: 5),
        Text(detail,
            style: TextStyle(fontSize: 12, color: context.onSurfaceSecondary)),
        if (child != null) child!
      ]))
    ]);
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
    Widget line(String label, int value) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              child: Text(label,
                  style: TextStyle(
                      fontSize: 13, color: context.onSurfaceSecondary))),
          const SizedBox(width: 12),
          Flexible(
              child: Text(refundMoney(value, currency),
                  textAlign: TextAlign.end,
                  style: const TextStyle(fontSize: 13)))
        ]));
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      line(tax == null ? 'Items & original tax' : 'Items after discounts',
          amount - shipping - (tax ?? 0)),
      if (tax != null) line('Original tax', tax!),
      line('Shipping refund', shipping),
      Divider(color: context.borderColor),
      const SizedBox(height: 10),
      Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 16,
          runSpacing: 8,
          children: [
            const Text('Refund total',
                style: TextStyle(fontWeight: FontWeight.w600)),
            Text(refundMoney(amount, currency),
                style:
                    const TextStyle(fontSize: 24, fontWeight: FontWeight.w700))
          ])
    ]);
  }
}

class RefundPolicy extends StatelessWidget {
  final DateTime? deliveredAt;
  const RefundPolicy({super.key, this.deliveredAt});
  @override
  Widget build(BuildContext context) => ExpansionTile(
          tilePadding: EdgeInsets.zero,
          childrenPadding: const EdgeInsets.only(bottom: 16),
          leading: const Icon(Icons.schedule_outlined, size: 20),
          title: const Text('Refund policy & shipping',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          children: [
            Text(
                'Request within seven days of recorded delivery. Seller approval starts the refund; no return is required. Shipping is included only when all paid items are refunded for seller fault. Change of mind is only allowed while pending.',
                style: TextStyle(
                    fontSize: 13,
                    height: 1.6,
                    color: context.onSurfaceSecondary)),
            if (deliveredAt != null)
              Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('Delivered ${refundDate(deliveredAt)}',
                      style: const TextStyle(fontSize: 12)))
          ]);
}

class RefundStatusBadge extends StatelessWidget {
  final RefundRequestData request;
  const RefundStatusBadge({super.key, required this.request});
  @override
  Widget build(BuildContext context) {
    final done = request.state == 'refunded';
    final color = done
        ? (context.isDark ? Colors.green.shade200 : Colors.green.shade800)
        : (context.isDark ? Colors.amber.shade200 : Colors.brown.shade800);
    return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
            color: (done ? AppColors.success : AppColors.warning)
                .withAlpha(context.isDark ? 35 : 22),
            borderRadius: BorderRadius.circular(9)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(done ? Icons.check_circle_outline : Icons.schedule_outlined,
              size: 16, color: color),
          const SizedBox(width: 6),
          Flexible(
              child: Text(request.stateLabel,
                  style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600, color: color)))
        ]));
  }
}
