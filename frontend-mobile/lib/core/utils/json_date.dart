/// Parses an optional ISO date string from API JSON.
/// Returns null for a missing, non-string or unparseable value (never throws).
DateTime? parseOptionalDate(dynamic raw) {
  if (raw is! String || raw.isEmpty) return null;
  return DateTime.tryParse(raw);
}

/// Payment flow version of an order; absent or empty means a legacy order.
String parsePaymentFlowVersion(dynamic raw) =>
    raw is String && raw.isNotEmpty ? raw : 'legacy';
