/// Units of one order line that were paid back, and approved ones still being paid back.
class RefundedItemMark {
  final String lineId;
  final int refunded, processing;
  const RefundedItemMark(
      {required this.lineId, required this.refunded, required this.processing});
}

/// What a refund chip shows: all paid back, some paid back, or approved and still being paid back.
enum RefundKind { full, partial, processing }

/// How an order or one of its items is marked: the [label] and the [kind] of refund (the chip's fill and icon).
class RefundMark {
  final String label;
  final RefundKind kind;
  const RefundMark(this.label, this.kind);
}

/// "Refunded" when all of the item was paid back, a count when only some was, and "Refund processing"
/// while approved units are still being paid back. Null when nothing was refunded.
RefundMark? refundMarkFor(
    List<RefundedItemMark> marks, String? lineId, int quantity) {
  if (lineId == null) return null;
  final mark = marks.where((m) => m.lineId == lineId).firstOrNull;
  if (mark == null || mark.refunded + mark.processing == 0) return null;
  if (mark.processing == 0) {
    return mark.refunded >= quantity
        ? const RefundMark('Refunded', RefundKind.full)
        : RefundMark(
            '${mark.refunded} of $quantity refunded', RefundKind.partial);
  }
  return RefundMark(
      mark.refunded == 0
          ? 'Refund processing'
          : '${mark.refunded} refunded, ${mark.processing} processing',
      RefundKind.processing);
}

/// How a whole order is labelled for its refunds. A refund still in flight comes first, because it is
/// what the reader has to watch: "Refund processing" once the seller approved it (money is reserved),
/// "Refund requested" while it still waits for the seller. Otherwise fully or partly refunded; null when
/// there is none.
RefundMark? orderRefundLabel({
  String? paymentStatus,
  int refundedAmountMinor = 0,
  int refundReservedAmountMinor = 0,
  bool refundRequestActive = false,
}) {
  if (refundReservedAmountMinor > 0) {
    return const RefundMark('Refund processing', RefundKind.processing);
  }
  if (refundRequestActive) {
    return const RefundMark('Refund requested', RefundKind.processing);
  }
  if (paymentStatus == 'refunded') {
    return const RefundMark('Fully refunded', RefundKind.full);
  }
  if (refundedAmountMinor > 0) {
    return const RefundMark('Partially refunded', RefundKind.partial);
  }
  return null;
}
