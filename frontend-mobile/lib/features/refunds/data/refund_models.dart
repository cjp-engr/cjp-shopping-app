import 'package:intl/intl.dart';
import '../../../../core/utils/json_date.dart';

int refundFactor(String currency) => currency.toLowerCase() == 'jpy' ? 1 : 100;
String refundMoney(int amount, String currency) => NumberFormat.simpleCurrency(
        name: currency.toUpperCase(),
        decimalDigits: currency.toLowerCase() == 'jpy' ? 0 : 2)
    .format(amount / refundFactor(currency));
String refundOrderDate(DateTime? date) =>
    date == null ? '' : DateFormat.yMMMMd().format(date.toLocal());
String refundDate(DateTime? date) => date == null
    ? 'Date unavailable'
    : DateFormat.yMMMd().add_jm().format(date.toLocal());
const refundReasons = {
  'damaged': 'Damaged item',
  'wrong_item': 'Wrong item',
  'missing_items': 'Missing items',
  'not_as_described': 'Not as described',
  'other': 'Other'
};
const refundEligibilityReasons = {
  'not_delivered': 'Refund requests are available after delivery.',
  'delivery_unknown': 'This order has no verified delivery date.',
  'window_closed': 'The seven-day refund request window has ended.',
  'unsupported_payment': 'This payment method does not support in-app refunds.',
  'payment_not_refundable': 'This payment is not eligible for another refund.',
  'seller_unverified': 'Seller details need review.',
  'active_request':
      'A request is already awaiting a decision or payment outcome.',
  'no_units_left': 'All refundable units have been requested.',
  'review_needed': 'Payment details need review before another request.',
};

class RefundLine {
  final String? image;
  final String id, name;
  final int available;
  final List<int> amounts;
  RefundLine.fromJson(Map<String, dynamic> json)
      : id = json['lineId'] as String? ?? '',
        image = json['productImage'] as String?,
        name = json['productName'] as String? ?? '',
        available = (json['quantityAvailable'] as num?)?.toInt() ?? 0,
        amounts = List<int>.unmodifiable(
            (json['availableUnitAmountsMinor'] as List? ?? [])
                .map((v) => (v as num).toInt()));
}

class RefundEligibility {
  final int shippingRefundable;
  final bool eligible, requestsEnabled;
  final String? reason;
  final String currency;
  final DateTime? deliveredAt, deadlineAt;
  final List<RefundLine> lines;
  RefundEligibility.fromJson(Map<String, dynamic> json)
      : eligible = json['eligible'] == true,
        requestsEnabled = json['requestsEnabled'] == true,
        reason = json['reason'] as String?,
        currency = json['currency'] as String? ?? 'usd',
        shippingRefundable =
            (json['shippingRefundableMinor'] as num?)?.toInt() ?? 0,
        deliveredAt = parseOptionalDate(json['deliveredAt']),
        deadlineAt = parseOptionalDate(json['deadlineAt']),
        lines = List<RefundLine>.unmodifiable((json['lines'] as List? ?? [])
            .map((v) =>
                RefundLine.fromJson(Map<String, dynamic>.from(v as Map))));
  int? quote(Map<String, int> quantities, {String reason = 'damaged'}) {
    var total = 0;
    for (final entry in quantities.entries) {
      final found = lines.where((l) => l.id == entry.key);
      if (found.length != 1 ||
          entry.value < 0 ||
          entry.value > found.first.available ||
          entry.value > found.first.amounts.length) {
        return null;
      }
      total += found.first.amounts.take(entry.value).fold(0, (s, a) => s + a);
    }
    return total + shippingQuote(quantities, reason);
  }

  int shippingQuote(Map<String, int> quantities, String reason) {
    if (!const ['damaged', 'wrong_item', 'missing_items', 'not_as_described']
            .contains(reason) ||
        shippingRefundable <= 0 ||
        !quantities.values.any((q) => q > 0) ||
        quantities.entries.any((e) => !lines.any((l) =>
            l.id == e.key &&
            e.value >= 0 &&
            e.value <= l.available &&
            e.value <= l.amounts.length))) {
      return 0;
    }
    return lines.every((l) => (quantities[l.id] ?? 0) == l.available)
        ? shippingRefundable
        : 0;
  }
}

class RefundUnitData {
  final String? image;
  final int tax;
  final String lineId, name;
  final int ordinal, amount;
  RefundUnitData.fromJson(Map<String, dynamic> json)
      : lineId = json['lineId'] as String? ?? '',
        image = json['productImage'] as String?,
        tax = (json['taxMinor'] as num?)?.toInt() ?? 0,
        name = json['productName'] as String? ?? 'Order item',
        ordinal = (json['ordinal'] as num?)?.toInt() ?? 0,
        amount = ((json['merchandiseMinor'] as num?)?.toInt() ?? 0) +
            ((json['taxMinor'] as num?)?.toInt() ?? 0);
}

class RefundRequestData {
  final String id, orderId, state, currency, reason, description;
  final int amount, shipping;
  final bool canDecide;
  final String? rejectionReason;

  /// Store name (buyer list) or buyer name (seller list); null when the account is gone.
  final String? sellerName, buyerName;
  final DateTime? submittedAt, decidedAt, completedAt, orderPlacedAt;

  /// Payment status of the whole order (`refunded`, `partially_refunded`, ...); null when the server sent none.
  final String? orderPaymentStatus;
  final List<RefundUnitData> units;
  RefundRequestData.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String? ?? '',
        orderId = json['orderId'] as String? ?? '',
        state = json['state'] as String? ?? 'needs_review',
        currency = json['currency'] as String? ?? 'usd',
        reason = json['reasonCode'] as String? ?? 'other',
        description = json['description'] as String? ?? '',
        amount = (json['amountMinor'] as num?)?.toInt() ?? 0,
        shipping = (json['shippingMinor'] as num?)?.toInt() ?? 0,
        canDecide = json['canDecide'] == true,
        rejectionReason = json['rejectionReason'] as String?,
        sellerName = json['sellerName'] as String?,
        buyerName = json['buyerName'] as String?,
        orderPlacedAt = parseOptionalDate(json['orderPlacedAt']),
        orderPaymentStatus = json['orderPaymentStatus'] as String?,
        submittedAt = parseOptionalDate(json['submittedAt']),
        decidedAt = parseOptionalDate(json['decidedAt']),
        completedAt = parseOptionalDate(json['completedAt']),
        units = List<RefundUnitData>.unmodifiable((json['units'] as List? ?? [])
            .map((v) =>
                RefundUnitData.fromJson(Map<String, dynamic>.from(v as Map))));

  /// The seller has approved the request: it is processing, needs payment review, or is refunded.
  /// These are what the Return/Refund tab lists; waiting and rejected requests stay with the order.
  bool get approvedBySeller =>
      const {'processing', 'needs_review', 'refunded'}.contains(state);
  String get amountCaption => state == 'refunded'
      ? 'Refund completed'
      : approvedBySeller
          ? 'Refund approved'
          : 'Requested refund';

  /// The status on a Return/Refund card: a settled refund says Fully or Partially refunded by what
  /// happened to the whole order; anything else keeps [stateLabel].
  String get cardStateLabel {
    if (state == 'refunded') {
      if (orderPaymentStatus == 'refunded') {
        return 'Fully refunded';
      }
      if (orderPaymentStatus == 'partially_refunded') {
        return 'Partially refunded';
      }
    }
    return stateLabel;
  }

  String get stateLabel =>
      const {
        'requested': 'Awaiting seller review',
        'processing': 'Refund processing',
        'refunded': 'Refunded',
        'rejected': 'Rejected',
        'needs_review': 'Refund needs payment review'
      }[state] ??
      'Refund needs payment review';
}

class SellerRefundPage {
  final List<RefundRequestData> requests;
  final int page, pages, total;

  /// How many requests are in each group (`in_progress`, `approved`, `rejected`); seller list only.
  final Map<String, int> counts;
  SellerRefundPage.fromJson(Map<String, dynamic> json)
      : counts = Map<String, int>.unmodifiable({
          for (final e in (json['counts'] as Map? ?? const {}).entries)
            e.key as String: (e.value as num).toInt()
        }),
        requests = List<RefundRequestData>.unmodifiable(
            (json['requests'] as List? ?? []).map((v) =>
                RefundRequestData.fromJson(
                    Map<String, dynamic>.from(v as Map)))),
        page = (json['page'] as num?)?.toInt() ?? 1,
        pages = (json['pages'] as num?)?.toInt() ?? 0,
        total = (json['total'] as num?)?.toInt() ?? 0;
}
