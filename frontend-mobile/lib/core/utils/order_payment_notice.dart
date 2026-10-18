import 'package:intl/intl.dart';
import '../../features/orders/domain/entities/order_entity.dart';

/// Mirrors the backend's SELLER_ACCEPT_WINDOW_MS: a seller has 24 hours to accept an order.
const Duration kSellerAcceptWindow = Duration(hours: 24);

enum OrderPaymentTone { info, success, neutral, warning }

class OrderPaymentNotice {
  final OrderPaymentTone tone;
  final String title;
  final String body;

  const OrderPaymentNotice({
    required this.tone,
    required this.title,
    required this.body,
  });
}

bool _isManualCapture(OrderEntity order) =>
    order.paymentFlowVersion == 'manual_capture';

bool canBuyerCancel(OrderEntity order) =>
    order.status == 'pending' &&
    !['refund_pending', 'refunded', 'failed'].contains(order.paymentStatus) &&
    (!_isManualCapture(order) ||
        order.paymentStatus == 'authorized' ||
        order.paymentStatus == 'not_required');

/// What the buyer sees when the seller cancelled their order, with the reason the
/// seller gave. Same copy as the web `cancelledBySellerNotice`.
OrderPaymentNotice? cancelledBySellerNotice(OrderEntity order) {
  if (order.status != 'cancelled' || order.cancelledByRole != 'seller') {
    return null;
  }
  final reason = order.cancelReason;
  return OrderPaymentNotice(
    tone: OrderPaymentTone.neutral,
    title: 'Cancelled by the seller',
    body: reason != null && reason.isNotEmpty
        ? 'The seller cancelled this order. Reason: $reason'
        : 'The seller cancelled this order.',
  );
}

/// Same payment and refund copy as the web, including refunds of legacy charges.
OrderPaymentNotice? orderPaymentNotice(OrderEntity order) {
  if (order.paymentErrorCode == 'refund_review' || order.paymentErrorCode == 'legacy_payment_review') {
    return const OrderPaymentNotice(tone: OrderPaymentTone.warning, title: 'Payment needs review', body: 'Please contact support to check this payment or refund. Do not pay again.');
  }
  if (!_isManualCapture(order) && !['refund_pending', 'refunded', 'partially_refunded'].contains(order.paymentStatus)) return null;
  switch (order.paymentStatus) {
    case 'partially_refunded':
      return const OrderPaymentNotice(tone: OrderPaymentTone.neutral, title: 'Partially refunded', body: 'Part of your payment was refunded. See item refund history for amounts and decisions.');
    case 'authorized':
      return const OrderPaymentNotice(
        tone: OrderPaymentTone.info,
        title: 'Payment reserved',
        body:
            'Your payment is reserved. It is charged when the seller starts preparing your order.',
      );
    case 'capture_pending':
      return const OrderPaymentNotice(
        tone: OrderPaymentTone.info,
        title: 'Charging payment',
        body:
            'Your payment is being charged as the seller starts preparing your order.',
      );
    case 'captured':
      return const OrderPaymentNotice(
        tone: OrderPaymentTone.success,
        title: 'Payment charged',
        body:
            'Your payment was charged when the seller started preparing your order.',
      );
    case 'release_pending':
      return const OrderPaymentNotice(
        tone: OrderPaymentTone.neutral,
        title: 'Releasing reservation',
        body:
            'The payment reservation is being released. You will not be charged.',
      );
    case 'released':
      return const OrderPaymentNotice(
        tone: OrderPaymentTone.neutral,
        title: 'Reservation released',
        body: 'The payment reservation was released. You were not charged.',
      );
    case 'refund_pending':
      return const OrderPaymentNotice(
        tone: OrderPaymentTone.neutral,
        title: 'Refund in progress',
        body: 'Your refund has been requested and is being processed.',
      );
    case 'refunded':
      return const OrderPaymentNotice(
        tone: OrderPaymentTone.success,
        title: 'Refunded',
        body: 'Your payment was refunded.',
      );
    case 'failed':
      return const OrderPaymentNotice(
        tone: OrderPaymentTone.warning,
        title: 'Payment problem',
        body:
            'We could not complete the payment for this order. Contact support if this continues.',
      );
    default:
      return null;
  }
}

/// The seller's acceptance deadline as a sentence, while a manual-capture order
/// is still waiting for the seller. The year is shown only when it differs from [now].
String? orderAcceptanceDeadlineText(OrderEntity order, DateTime now) {
  final acceptBy = order.acceptBy;
  if (!_isManualCapture(order) || order.status != 'pending' || acceptBy == null) {
    return null;
  }
  final local = acceptBy.toLocal();
  final pattern = local.year == now.toLocal().year ? 'MMM d, h:mm a' : 'MMM d, y, h:mm a';
  return 'The seller has until ${DateFormat(pattern).format(local)} to accept';
}

/// True when the card authorization ends before the usual 24-hour acceptance window.
bool hasShortAcceptanceWindow(OrderEntity order) {
  final placedAt = order.placedAt;
  final acceptBy = order.acceptBy;
  if (!_isManualCapture(order) || order.status != 'pending') return false;
  if (placedAt == null || acceptBy == null) return false;
  return acceptBy.isBefore(placedAt.add(kSellerAcceptWindow));
}
