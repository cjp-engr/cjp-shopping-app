import type { Cart } from '../types/cart';
import type { Address } from '../types/user';
import type { CardPaymentMethod, CheckoutSessionCreateInput } from '../types/checkout';

interface BuildCheckoutSessionPayloadInput {
  cart: Cart;
  shippingAddress: Address;
  paymentMethod: CardPaymentMethod;
  couponCodes?: Record<string, string>;
  deliverySelections?: Record<string, string>;
  sellerMessages?: Record<string, string>;
  savedPaymentMethodId?: string;
}

/**
 * Builds the checkout session request. Only identifiers, quantities and the
 * buyer's choices are sent; the server prices the cart itself.
 */
export function buildCheckoutSessionPayload(input: BuildCheckoutSessionPayloadInput): CheckoutSessionCreateInput {
  const { cart } = input;
  return {
    items: cart.items.map(item => ({
      productId: item.product.id,
      variantId: item.selectedVariant?._id,
      selectedAttributes: item.selectedVariant?.attributes,
      quantity: item.quantity,
    })),
    shippingAddress: input.shippingAddress,
    paymentMethod: input.paymentMethod,
    ...(hasEntries(input.couponCodes) ? { couponCodes: input.couponCodes } : {}),
    ...(hasEntries(input.deliverySelections) ? { deliverySelections: input.deliverySelections } : {}),
    ...(hasEntries(input.sellerMessages) ? { sellerMessages: input.sellerMessages } : {}),
    ...(input.savedPaymentMethodId ? { savedPaymentMethodId: input.savedPaymentMethodId } : {}),
  };
}

function hasEntries(record: Record<string, string> | undefined): record is Record<string, string> {
  return !!record && Object.keys(record).length > 0;
}
