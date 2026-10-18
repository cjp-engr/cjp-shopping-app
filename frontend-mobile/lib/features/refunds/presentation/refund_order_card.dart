import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/seller_avatar.dart';
import '../data/refund_models.dart';
import 'refund_components.dart';

enum RefundViewer { buyer, seller }

class _Look {
  final Color color;
  final IconData icon;
  const _Look(this.color, this.icon);
}

_Look _lookOf(String state) {
  switch (state) {
    case 'refunded':
      return const _Look(AppColors.success, Icons.check_circle_outline);
    case 'needs_review':
    case 'rejected':
      return const _Look(AppColors.danger, Icons.error_outline);
    default:
      return const _Look(AppColors.warning, Icons.schedule_outlined);
  }
}

/// What the card says about the request, by who is looking and where it is in its life.
String? _bannerOf(RefundViewer viewer, String state) {
  if (viewer == RefundViewer.seller) {
    return const {
      'requested':
          'Awaiting your decision. The buyer keeps the item if you approve.',
      'refunded':
          'Refund completed and confirmed. The buyer’s bank may take additional time to post it.',
      'processing': 'You approved this request. The refund is processing.',
      'needs_review':
          'The payment needs reconciliation. New requests for this order are paused.',
      'rejected': 'You rejected this request.',
    }[state];
  }
  return const {
    'refunded':
        'The refund is confirmed. Your bank may take additional time to post it.',
    'processing': 'Approved by the seller. Your refund is processing.',
    'needs_review':
        'The payment needs reconciliation. Do not submit a replacement request.',
  }[state];
}

/// One word for what happened to the items, so the card never says "refunded" before it is.
String _wordOf(String state) =>
    const {
      'refunded': 'refunded',
      'processing': 'approved',
      'needs_review': 'approved',
      'requested': 'requested',
      'rejected': 'rejected',
    }[state] ??
    'requested';

class _Line {
  final String id, name;
  final String? image;
  final List<int> amounts = [];
  _Line(this.id, this.name, this.image);
  int get total => amounts.fold(0, (sum, a) => sum + a);
  int? get each =>
      amounts.every((a) => a == amounts.first) ? amounts.first : null;
}

/// One row per order line, however many of its units are in the request.
List<_Line> _linesOf(RefundRequestData request) {
  final lines = <String, _Line>{};
  for (final unit in request.units) {
    lines
        .putIfAbsent(
            unit.lineId, () => _Line(unit.lineId, unit.name, unit.image))
        .amounts
        .add(unit.amount);
  }
  return lines.values.toList();
}

String _dateCaption(RefundRequestData r) {
  if (r.state == 'refunded') return 'Completed ${refundDate(r.completedAt)}';
  if (r.approvedBySeller) {
    return 'Approved ${refundDate(r.decidedAt ?? r.submittedAt)}';
  }
  if (r.state == 'rejected') {
    return 'Rejected ${refundDate(r.decidedAt ?? r.submittedAt)}';
  }
  return 'Submitted ${refundDate(r.submittedAt)}';
}

/// A refund request laid out like the order card in My Orders: who it is with and its status,
/// order number and date, the items with their prices, a total bar, a status banner and actions.
/// [decision] is the seller's approve and reject area, shown between the banner and the buttons.
class RefundOrderCard extends StatefulWidget {
  final RefundRequestData request;
  final RefundViewer viewer;
  final Widget? decision;
  final VoidCallback? onViewOrder;
  const RefundOrderCard(
      {super.key,
      required this.request,
      this.viewer = RefundViewer.buyer,
      this.decision,
      this.onViewOrder});
  @override
  State<RefundOrderCard> createState() => _RefundOrderCardState();
}

class _RefundOrderCardState extends State<RefundOrderCard> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final r = widget.request;
    final seller = widget.viewer == RefundViewer.seller;
    final look = _lookOf(r.state);
    final party = (seller ? r.buyerName : r.sellerName)?.trim();
    final partyName = party != null && party.isNotEmpty
        ? party
        : (seller ? 'Buyer' : 'Store');
    final lines = _linesOf(r);
    final count = lines.fold<int>(0, (s, l) => s + l.amounts.length);
    final word = _wordOf(r.state);
    final banner = _bannerOf(widget.viewer, r.state);
    final shortId =
        r.orderId.length > 8 ? r.orderId.substring(0, 8) : r.orderId;

    return Container(
      key: ValueKey('refund-card-${r.id}'),
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
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
              AppSizes.md, AppSizes.md, AppSizes.md, AppSizes.sm),
          child: Row(children: [
            SellerAvatar(name: partyName, size: 20),
            const SizedBox(width: 8),
            Expanded(
                child: Text(partyName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: context.onSurfaceColor))),
            const SizedBox(width: 8),
            Flexible(
                child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                  color: look.color.withAlpha(24),
                  borderRadius: BorderRadius.circular(20)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(look.icon, size: 14, color: look.color),
                const SizedBox(width: 4),
                Flexible(
                    child: Text(r.stateLabel,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: look.color))),
              ]),
            )),
          ]),
        ),
        const Divider(height: 1),
        Container(
          width: double.infinity,
          color: context.surfaceVariantColor,
          padding: const EdgeInsets.symmetric(
              horizontal: AppSizes.md, vertical: AppSizes.sm),
          child: Text(
              'Order #${shortId.toUpperCase()}${r.orderPlacedAt == null ? '' : '  ·  ${refundOrderDate(r.orderPlacedAt)}'}',
              style:
                  TextStyle(fontSize: 12, color: context.onSurfaceSecondary)),
        ),
        for (final line in lines) _ItemRow(line: line, request: r, word: word),
        Container(
          width: double.infinity,
          color: context.surfaceVariantColor,
          padding: const EdgeInsets.symmetric(
              horizontal: AppSizes.md, vertical: AppSizes.sm + 4),
          child: Row(children: [
            Expanded(
                child: Text(
                    '$count item${count == 1 ? '' : 's'} $word${r.shipping > 0 ? ' · incl. ${refundMoney(r.shipping, r.currency)} shipping' : ''}',
                    style: TextStyle(
                        fontSize: 13, color: context.onSurfaceSecondary))),
            const SizedBox(width: 12),
            Text(refundMoney(r.amount, r.currency),
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: context.onSurfaceColor)),
          ]),
        ),
        if (banner != null)
          Container(
            width: double.infinity,
            color: look.color.withAlpha(context.isDark ? 30 : 20),
            padding: const EdgeInsets.symmetric(
                horizontal: AppSizes.md, vertical: AppSizes.sm + 2),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(look.icon, size: 16, color: look.color),
              const SizedBox(width: 8),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(banner,
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: context.onSurfaceColor)),
                    if (r.rejectionReason != null)
                      Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text('Reason: ${r.rejectionReason}',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: context.onSurfaceColor))),
                    Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                            '${_dateCaption(r)} · original payment method',
                            style: TextStyle(
                                fontSize: 12,
                                color: context.onSurfaceSecondary))),
                  ])),
            ]),
          ),
        if (widget.decision != null)
          Padding(
              padding: const EdgeInsets.all(AppSizes.md),
              child: widget.decision),
        Padding(
          padding: const EdgeInsets.fromLTRB(
              AppSizes.md, AppSizes.sm, AppSizes.md, AppSizes.sm),
          // A Wrap so the two buttons stack instead of overflowing at large text sizes.
          child: Wrap(
              alignment: widget.onViewOrder != null
                  ? WrapAlignment.spaceBetween
                  : WrapAlignment.end,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 4,
              children: [
                if (widget.onViewOrder != null)
                  OutlinedButton.icon(
                      onPressed: widget.onViewOrder,
                      icon: const Icon(Icons.visibility_outlined, size: 16),
                      label: const Text('View Details')),
                TextButton.icon(
                    onPressed: () => setState(() => _open = !_open),
                    icon: Icon(_open ? Icons.expand_less : Icons.expand_more,
                        size: 18),
                    label: const Text('Refund details')),
              ]),
        ),
        if (_open)
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSizes.md, 0, AppSizes.md, AppSizes.md),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(seller ? 'BUYER’S EXPLANATION' : 'YOUR EXPLANATION',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: context.onSurfaceSecondary)),
              const SizedBox(height: 4),
              Text(r.description,
                  style: const TextStyle(fontSize: 13, height: 1.5)),
              const SizedBox(height: 16),
              RefundBreakdown(
                  amount: r.amount,
                  shipping: r.shipping,
                  tax: r.units.fold(0, (s, u) => s! + u.tax),
                  currency: r.currency),
            ]),
          ),
      ]),
    );
  }
}

class _ItemRow extends StatelessWidget {
  final _Line line;
  final RefundRequestData request;
  final String word;
  const _ItemRow(
      {required this.line, required this.request, required this.word});

  @override
  Widget build(BuildContext context) {
    final fallback = Container(
        color: context.surfaceVariantColor,
        alignment: Alignment.center,
        child: Icon(Icons.inventory_2_outlined,
            size: 22, color: context.onSurfaceSecondary));
    final quantity = line.amounts.length;
    final each = line.each;
    return Padding(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(
            borderRadius: BorderRadius.circular(AppSizes.radiusSm),
            child: SizedBox(
                width: 56,
                height: 56,
                child: line.image == null || line.image!.isEmpty
                    ? fallback
                    : Image.network(line.image!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => fallback))),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(line.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style:
                  const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('x$quantity · ${refundReasons[request.reason] ?? 'Other'}',
              style:
                  TextStyle(fontSize: 12, color: context.onSurfaceSecondary)),
        ])),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(refundMoney(line.total, request.currency),
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primaryDark)),
          const SizedBox(height: 4),
          Text(
              each != null && quantity > 1
                  ? '${refundMoney(each, request.currency)} each'
                  : word,
              style:
                  TextStyle(fontSize: 12, color: context.onSurfaceSecondary)),
        ]),
      ]),
    );
  }
}
