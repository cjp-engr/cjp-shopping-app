import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_sizes.dart';
import '../../../../core/theme/theme_colors.dart';
import '../../../../shared/widgets/seller_avatar.dart';
import '../data/refund_models.dart';
import '../../orders/domain/refund_mark.dart';
import '../../orders/presentation/widgets/refund_item_badge.dart';
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

/// The chip in a card's header: violet for a settled refund (partial when only part of the order was
/// refunded), amber while it is requested or being paid back. Null for rejected and needs-review, which
/// keep their own red pill. On the order page the card is one request of several, so it keeps the plain
/// "Refunded".
RefundMark? _chipOf(RefundRequestData r, bool inOrder) {
  switch (r.state) {
    case 'refunded':
      if (inOrder) return const RefundMark('Refunded', RefundKind.full);
      return RefundMark(
          r.cardStateLabel,
          r.orderPaymentStatus == 'partially_refunded'
              ? RefundKind.partial
              : RefundKind.full);
    case 'processing':
      return const RefundMark('Refund processing', RefundKind.processing);
    case 'requested':
      return const RefundMark('Awaiting seller review', RefundKind.processing);
    default:
      return null;
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
    'requested': 'Waiting for the seller. You can check the decision here.',
    'rejected': 'The seller rejected this request.',
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
/// [inOrder] is for the buyer's own order page, which already shows the store and the order: the
/// card then drops the store name, the order strip and View Details.
class RefundOrderCard extends StatefulWidget {
  final RefundRequestData request;
  final RefundViewer viewer;
  final Widget? decision;
  final bool inOrder;
  final VoidCallback? onViewOrder;
  const RefundOrderCard(
      {super.key,
      required this.request,
      this.viewer = RefundViewer.buyer,
      this.decision,
      this.inOrder = false,
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
          // A Wrap, not a Row of Expanded and Flexible: those split the free space between them, which
          // cut the status pill off and left it floating beside the title. Here the pill keeps its full
          // width, sits at the right edge when there is room, and drops below the title when there is not.
          child: SizedBox(
              width: double.infinity,
              child: Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      if (widget.inOrder)
                        Icon(Icons.currency_exchange,
                            size: 18, color: context.onSurfaceSecondary)
                      else
                        SellerAvatar(name: partyName, size: 20),
                      const SizedBox(width: 8),
                      Flexible(
                          child: Text(
                              widget.inOrder ? 'Refund request' : partyName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: context.onSurfaceColor))),
                    ]),
                    if (_chipOf(r, widget.inOrder) case final chip?)
                      RefundItemBadge(mark: chip, topPadding: 0)
                    else
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                            color: look.color.withAlpha(24),
                            borderRadius: BorderRadius.circular(20)),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Icon(look.icon, size: 14, color: look.color),
                          const SizedBox(width: 4),
                          Flexible(
                              child: Text(r.stateLabel,
                                  style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: look.color))),
                        ]),
                      ),
                  ])),
        ),
        const Divider(height: 1),
        if (!widget.inOrder)
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
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
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
                          padding: const EdgeInsets.only(top: 8, bottom: 4),
                          // The reason as a quote: an accent bar, a light fill, readable text.
                          child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                  color: Colors.white
                                      .withAlpha(context.isDark ? 14 : 150),
                                  child: IntrinsicHeight(
                                      child: Row(children: [
                                    Container(width: 3, color: look.color),
                                    Expanded(
                                        child: Padding(
                                            padding: const EdgeInsets.fromLTRB(
                                                10, 8, 10, 8),
                                            child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                      seller
                                                          ? 'Your reason'
                                                          : 'Seller\u2019s reason',
                                                      style: TextStyle(
                                                          fontSize: 11,
                                                          fontWeight:
                                                              FontWeight.w700,
                                                          letterSpacing: 0.4,
                                                          color: context
                                                              .onSurfaceSecondary)),
                                                  const SizedBox(height: 2),
                                                  Text(r.rejectionReason!,
                                                      style: TextStyle(
                                                          fontSize: 13,
                                                          height: 1.4,
                                                          fontWeight:
                                                              FontWeight.w500,
                                                          color: context
                                                              .onSurfaceColor)),
                                                ]))),
                                  ]))))),
                    Padding(
                        padding: const EdgeInsets.only(top: 2),
                        // Only a refund that is approved or done goes to a payment method.
                        child: Text(
                            '${_dateCaption(r)}${r.approvedBySeller ? ' · original payment method' : ''}',
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
        if (widget.onViewOrder != null && !widget.inOrder)
          // Same button as "Track Order" on My Orders: outlined brand orange, full width.
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSizes.md, AppSizes.sm, AppSizes.md, AppSizes.sm),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: widget.onViewOrder,
                icon: const Icon(Icons.visibility_outlined, size: 16),
                label: const Text('View Details'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppSizes.radiusSm)),
                  textStyle: const TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      fontSize: 13,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ),
        if (widget.onViewOrder == null || widget.inOrder)
          const Divider(height: 1),
        // Same anatomy as the other expandable rows: icon, title, chevron at the right edge.
        Semantics(
          button: true,
          expanded: _open,
          child: InkWell(
            onTap: () => setState(() => _open = !_open),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: AppSizes.md, vertical: 14),
              child: Row(children: [
                Icon(Icons.receipt_long_outlined,
                    size: 20, color: context.onSurfaceSecondary),
                const SizedBox(width: 12),
                Expanded(
                    child: Text('Refund details',
                        style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: context.onSurfaceColor))),
                Icon(_open ? Icons.expand_less : Icons.expand_more,
                    color: context.onSurfaceSecondary),
              ]),
            ),
          ),
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
    final quantity = line.amounts.length;
    final each = line.each;
    return Padding(
      padding: const EdgeInsets.all(AppSizes.md),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        RefundItemImage(image: line.image),
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
              style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: request.state == 'rejected'
                      ? context.onSurfaceSecondary
                      : AppColors.primaryDark)),
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
