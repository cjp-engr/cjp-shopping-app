import 'package:flutter/material.dart';
import '../../../../core/theme/theme_colors.dart';
import '../data/refund_models.dart';
import 'refund_components.dart';

class RefundRequestCard extends StatelessWidget {
  final RefundRequestData request;
  final Widget? actions;
  final bool sellerReview;
  const RefundRequestCard(
      {super.key,
      required this.request,
      this.actions,
      this.sellerReview = false});
  @override
  Widget build(BuildContext context) {
    final done = request.state == 'refunded';
    return RefundSurface(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      RefundStatusBadge(request: request),
      const SizedBox(height: 16),
      Text(refundMoney(request.amount, request.currency),
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700)),
      const SizedBox(height: 4),
      Text('${request.amountCaption} · original payment method',
          style: TextStyle(fontSize: 12, color: context.onSurfaceSecondary)),
      const SizedBox(height: 16),
      Divider(color: context.borderColor),
      const SizedBox(height: 16),
      for (final u in request.units)
        Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: RefundProduct(
                name: u.name,
                image: u.image,
                detail:
                    'Unit ${u.ordinal} · ${refundReasons[request.reason] ?? 'Other'} · ${refundMoney(u.amount, request.currency)}')),
      Text(
          'Order #${request.orderId.length > 8 ? request.orderId.substring(request.orderId.length - 8) : request.orderId}',
          style: TextStyle(fontSize: 12, color: context.onSurfaceSecondary)),
      const SizedBox(height: 8),
      Text(
          done
              ? 'Completed ${refundDate(request.completedAt)}'
              : request.approvedBySeller
                  ? 'Approved ${refundDate(request.decidedAt ?? request.submittedAt)}'
                  : 'Submitted ${refundDate(request.submittedAt)}',
          style: TextStyle(fontSize: 12, color: context.onSurfaceSecondary)),
      const SizedBox(height: 12),
      if (request.state == 'requested' && !sellerReview)
        const Text('Waiting for the seller. You can check the decision here.',
            style: TextStyle(fontSize: 13)),
      if (request.state == 'processing')
        const Text('Approved. Your refund is processing.',
            style: TextStyle(fontSize: 13)),
      if (request.state == 'needs_review')
        const Text(
            'Payment needs reconciliation. Do not submit a replacement request.',
            style: TextStyle(fontSize: 13)),
      if (done)
        const Text(
            'The refund is confirmed. Your bank may take additional time to post it.',
            style: TextStyle(fontSize: 13)),
      if (request.rejectionReason != null)
        Text('Seller response: ${request.rejectionReason}',
            style: const TextStyle(fontSize: 13)),
      ExpansionTile(
          tilePadding: EdgeInsets.zero,
          initiallyExpanded: sellerReview,
          title: Text(
              sellerReview
                  ? 'Buyer’s explanation & refund'
                  : 'View refund details',
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          children: [
            Align(
                alignment: Alignment.centerLeft,
                child: Text(request.description,
                    style: TextStyle(
                        fontSize: 13,
                        height: 1.6,
                        color: context.onSurfaceSecondary))),
            const SizedBox(height: 16),
            RefundBreakdown(
                amount: request.amount,
                shipping: request.shipping,
                tax: request.units.fold(0, (s, u) => s! + u.tax),
                currency: request.currency),
            const SizedBox(height: 12)
          ]),
      if (actions != null) ...[const SizedBox(height: 12), actions!],
    ]));
  }
}
