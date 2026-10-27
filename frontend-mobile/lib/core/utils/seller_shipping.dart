/// Flat fee when the seller set none. Must match STANDARD_SHIPPING_FEE in
/// backend/src/services/checkoutPricing.ts.
const double defaultShippingFee = 9.99;

/// Shipping for one seller's order, mirroring `computeSellerTotals` on the
/// backend: free only when the seller says so, the configured option fee for
/// buyer-pays, and the flat default fee when nothing is set. The order amount
/// does not matter; there is no free-shipping threshold.
double sellerShippingFee({
  String? shippingFee,
  Map<String, double> shippingFeeAmounts = const {},
  String? selectedOption,
}) {
  if (shippingFee == 'free') return 0;
  if (shippingFee == 'buyer_pays') {
    final selected =
        selectedOption != null ? shippingFeeAmounts[selectedOption] : null;
    // An explicit fee, including 0, is the seller's choice
    return selected ?? shippingFeeAmounts.values.firstOrNull ?? defaultShippingFee;
  }
  return defaultShippingFee;
}
