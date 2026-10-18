/// Longest cancellation reason the server accepts (after trimming).
const int maxCancelReasonLength = 1000;

/// Where the card hold release stands after a seller cancellation. Absent for
/// cash on delivery. `pending` is never money returned: only `completed` is.
enum SellerPaymentOperation { pending, completed, needsReview }

/// What the server reported for a cancellation it accepted.
class SellerCancelOutcome {
  final SellerPaymentOperation? paymentOperation;
  const SellerCancelOutcome({this.paymentOperation});
}

/// Reads the `paymentOperation` object of a cancellation response. Anything else,
/// including the capture operation shape (`resolving`), is not a payment outcome.
SellerPaymentOperation? parsePaymentOperation(Object? raw) {
  if (raw is! Map) return null;
  switch (raw['status']) {
    case 'pending':
      return SellerPaymentOperation.pending;
    case 'completed':
      return SellerPaymentOperation.completed;
    case 'needs_review':
      return SellerPaymentOperation.needsReview;
    default:
      return null;
  }
}

/// Validation message for a cancellation reason (trimmed, 1 to 1000 characters);
/// null when it is acceptable.
String? cancelReasonError(String reason) {
  final trimmed = reason.trim();
  if (trimmed.isEmpty) {
    return 'Enter a reason for the cancellation. The buyer will see it.';
  }
  if (trimmed.length > maxCancelReasonLength) {
    return 'The reason must be at most $maxCancelReasonLength characters.';
  }
  return null;
}

String cancellationErrorMessage(String? code) {
  switch (code) {
    case 'invalid_cancel_reason':
      return 'Enter a reason of 1 to 1000 characters.';
    case 'cancellation_conflict':
      return 'This order was accepted, is being charged, or is no longer pending. Refresh to see its latest status.';
    case 'cancellation_unavailable':
      return 'This order cannot be cancelled by the seller.';
    case 'not_order_seller':
    case 'order_not_found':
      return 'This order is not available to you.';
    default:
      return 'Could not cancel the order. Please try again.';
  }
}

/// The order moved on (or is not the seller's), so the screen should refresh it.
bool isStaleCancellation(String? code) =>
    code == 'cancellation_conflict' ||
    code == 'cancellation_unavailable' ||
    code == 'not_order_seller' ||
    code == 'order_not_found';

/// Confirmation after a cancellation. Money is only called returned once the
/// release is complete.
String cancellationOutcomeMessage(SellerPaymentOperation? operation) {
  switch (operation) {
    case SellerPaymentOperation.pending:
      return 'Order cancelled. The card hold is being released.';
    case SellerPaymentOperation.completed:
      return 'Order cancelled. The card hold was released.';
    case SellerPaymentOperation.needsReview:
      return 'Order cancelled. Releasing the card hold needs support review.';
    case null:
      return 'Order cancelled.';
  }
}
