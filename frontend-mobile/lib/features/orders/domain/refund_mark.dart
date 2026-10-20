/// Units of one order line that were paid back, and approved ones still being paid back.
class RefundedItemMark {
  final String lineId;
  final int refunded, processing;
  const RefundedItemMark(
      {required this.lineId, required this.refunded, required this.processing});
}

/// How an order item with refunded units is marked: [label], and whether it is [done] (nothing still processing).
class RefundMark {
  final String label;
  final bool done;
  const RefundMark(this.label, this.done);
}

/// "Refunded" when all of the item was paid back, a count when only some was, and "Refund processing"
/// while approved units are still being paid back. Null when nothing was refunded.
RefundMark? refundMarkFor(
    List<RefundedItemMark> marks, String? lineId, int quantity) {
  if (lineId == null) return null;
  final mark = marks.where((m) => m.lineId == lineId).firstOrNull;
  if (mark == null || mark.refunded + mark.processing == 0) return null;
  if (mark.processing == 0) {
    return RefundMark(
        mark.refunded >= quantity
            ? 'Refunded'
            : '${mark.refunded} of $quantity refunded',
        true);
  }
  return RefundMark(
      mark.refunded == 0
          ? 'Refund processing'
          : '${mark.refunded} refunded, ${mark.processing} processing',
      false);
}
