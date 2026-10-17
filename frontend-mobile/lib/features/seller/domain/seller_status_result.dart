/// Outcome of a seller status change that the server accepted.
///
/// `resolving` means HTTP 202: the payment capture is still being resolved,
/// so the order has not moved on yet and must not be shown as `preparing`.
enum SellerStatusResult { completed, resolving }

/// A rejected seller order request, carrying the backend error `code`
/// (for example `capture_failed`) next to the server message.
class SellerOrderException implements Exception {
  final String message;
  final String? code;

  const SellerOrderException(this.message, {this.code});

  @override
  String toString() => message;
}
