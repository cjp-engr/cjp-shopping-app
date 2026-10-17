import 'package:intl/intl.dart';
import '../data/models/seller_order_model.dart';

/// Interval between silent refreshes while a payment capture is resolving.
const Duration capturePollInterval = Duration(seconds: 5);

/// Shown when the server answers 202: the capture is still being resolved.
const String captureResolvingMessage =
    'Payment is being charged. This order will move to preparing when it finishes.';

/// True while the seller's payment capture for this order is still resolving.
bool isCapturePending(SellerOrderData order) =>
    order.paymentStatus == 'capture_pending';

/// Polling continues only while at least one listed order awaits its capture.
bool hasCapturePending(Iterable<SellerOrderData> orders) =>
    orders.any(isCapturePending);

/// Legacy orders have no `acceptBy` and stay acceptable; at the exact deadline
/// acceptance is rejected.
bool canAcceptOrder(SellerOrderData order, DateTime now) {
  if (order.status != 'pending' || isCapturePending(order)) return false;
  final acceptBy = order.acceptBy;
  return acceptBy == null || acceptBy.isAfter(now);
}

String acceptanceErrorMessage(String? code) {
  switch (code) {
    case 'acceptance_deadline_passed':
      return 'The acceptance window for this order has ended.';
    case 'order_not_pending':
      return 'This order is no longer waiting for acceptance. Refresh to see its latest status.';
    case 'capture_failed':
      return 'The payment could not be charged. Try accepting again.';
    case 'authorization_expired':
      return "The buyer's payment reservation expired, so this order was cancelled.";
    case 'payment_reference_missing':
      return 'This order has no payment on file. Contact support.';
    case 'not_order_seller':
    case 'order_not_found':
      return 'This order is not available to you.';
    default:
      return 'Could not accept the order. Please try again.';
  }
}

/// Seller-facing countdown for a pending order; null when there is no deadline to show.
String? acceptanceDeadlineText(SellerOrderData order, DateTime now) {
  final acceptBy = order.acceptBy;
  if (order.status != 'pending' || acceptBy == null) return null;
  final remaining = acceptBy.difference(now);
  if (remaining <= Duration.zero) return 'Acceptance window ended';
  if (remaining > const Duration(hours: 24)) {
    return 'Accept by ${DateFormat('MMM d, y, h:mm a').format(acceptBy.toLocal())}';
  }

  final totalMinutes = (remaining.inMicroseconds / Duration.microsecondsPerMinute).ceil();
  final hours = totalMinutes ~/ 60;
  final minutes = totalMinutes % 60;
  final parts = [if (hours > 0) '${hours}h', if (minutes > 0) '${minutes}m'];
  return 'Accept within ${parts.join(' ')}';
}
