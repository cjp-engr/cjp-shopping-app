import { DEFAULT_SHIPPING_FEE } from './constants';

interface SellerShippingInput {
  /** The seller's setting: `free`, `buyer_pays`, or nothing. */
  shippingFee?: string;
  shippingFeeAmounts?: Record<string, number>;
  selectedOption?: string;
}

/**
 * Shipping for one seller's order, mirroring computeSellerTotals on the backend: free only when the seller
 * says so, the configured option fee for buyer-pays, and the flat default fee when nothing is set.
 * The order amount does not matter; there is no free-shipping threshold.
 */
export function sellerShippingFee({ shippingFee, shippingFeeAmounts = {}, selectedOption }: SellerShippingInput): number {
  if (shippingFee === 'free') return 0;
  if (shippingFee === 'buyer_pays') {
    const selected = selectedOption != null ? shippingFeeAmounts[selectedOption] : undefined;
    // An explicit fee, including 0, is the seller's choice
    return selected ?? Object.values(shippingFeeAmounts)[0] ?? DEFAULT_SHIPPING_FEE;
  }
  return DEFAULT_SHIPPING_FEE;
}
