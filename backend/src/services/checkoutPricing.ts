export const TAX_RATE = 0.08;
/**
 * The fee charged when a seller has not set one: a product with no `shippingFee`, or a buyer-pays product with
 * no fee configured. It is a flat safety net so the cost is never left to the seller. Shipping is free only when
 * the seller sets `free`. Keep in step with DEFAULT_SHIPPING_FEE (web) and defaultShippingFee (mobile).
 */
export const STANDARD_SHIPPING_FEE = 9.99;

/** Minor-unit exponents. Only currencies listed here can be charged. */
const CURRENCY_EXPONENTS: Record<string, number> = {
  usd: 2,
  eur: 2,
  php: 2,
  jpy: 0,
};

export function currencyExponent(currency: string): number {
  const exponent = CURRENCY_EXPONENTS[currency.toLowerCase()];
  if (exponent === undefined) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return exponent;
}

/** Single rounding point for payment amounts: round to the nearest minor unit. */
export function toMinorUnits(amount: number, currency: string): number {
  const factor = 10 ** currencyExponent(currency);
  return Math.round(Number((amount * factor).toFixed(6)));
}

export interface VariantLike {
  _id?: { toString(): string } | string;
  attributes?: unknown;
  price?: number;
  stock?: number;
  discount?: number;
  image?: string;
  images?: string[];
  sku?: string;
}

export interface ProductLike {
  _id: unknown;
  name: string;
  price: number;
  stock?: number;
  discount?: number;
  image: string;
  sellerId?: { toString(): string } | string | null;
  shippingFee?: string;
  shippingFeeAmounts?: unknown;
  shippingOptions?: string[];
  variants?: unknown;
}

export function findVariant(product: ProductLike, variantId?: string): VariantLike | undefined {
  if (!variantId) return undefined;
  const variants = product.variants as any;
  if (variants?.id) return variants.id(variantId) ?? undefined;
  return Array.isArray(variants)
    ? variants.find((v: VariantLike) => v._id?.toString() === variantId)
    : undefined;
}

export interface PricedLine {
  product: unknown;
  variantId?: string;
  productName: string;
  productPrice: number;
  productImage: string;
  variantImages?: string[];
  variantSku?: string;
  discountPercent: number;
  variantDiscount?: number;
  gross: number;
  itemDiscount: number;
}

export function priceLine(product: ProductLike, variantId: string | undefined, quantity: number): PricedLine {
  const variant = findVariant(product, variantId);
  const unitPrice = variant?.price ?? product.price;
  const gross = unitPrice * quantity;
  const discountPercent = variant ? (variant.discount ?? 0) : (product.discount ?? 0);
  return {
    product: product._id,
    variantId,
    productName: product.name,
    productPrice: unitPrice,
    productImage: (variant?.images?.length ? variant.images[0] : variant?.image) || product.image,
    variantImages: variant?.images?.length ? variant.images : undefined,
    variantSku: variant?.sku,
    discountPercent,
    variantDiscount: variant ? variant.discount : undefined,
    gross,
    itemDiscount: gross * (discountPercent / 100),
  };
}

export interface CouponLike {
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
  expiresAt?: Date;
  usageLimit?: number | null;
  usedCount: number;
}

/** Same validity rules as the legacy order path; an invalid coupon yields no discount. */
export function couponDiscountFor(coupon: CouponLike, effectiveSubtotal: number, now: Date): number {
  const valid =
    (!coupon.expiresAt || coupon.expiresAt > now) &&
    (coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit) &&
    effectiveSubtotal >= coupon.minOrderAmount;
  if (!valid) return 0;

  let discount = coupon.discountType === 'percentage'
    ? effectiveSubtotal * (coupon.discountValue / 100)
    : Math.min(coupon.discountValue, effectiveSubtotal);
  if (coupon.discountType === 'percentage' && coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return discount;
}

export interface SellerTotalsInput {
  sellerKey: string;
  subtotal: number;
  productDiscount: number;
  couponDiscount: number;
  firstProduct: Pick<ProductLike, 'shippingFee' | 'shippingFeeAmounts' | 'shippingOptions'>;
  deliverySelections: Record<string, string>;
}

export interface SellerTotals {
  effectiveSubtotal: number;
  afterAllDiscounts: number;
  tax: number;
  shipping: number;
  total: number;
  selectedDeliveryOption?: string;
}

export function plainShippingAmounts(raw: unknown): Record<string, number> {
  const value = raw as { toJSON?: () => Record<string, number> } | Record<string, number> | undefined;
  if (value && typeof (value as { toJSON?: unknown }).toJSON === 'function') {
    return (value as { toJSON: () => Record<string, number> }).toJSON();
  }
  return (value as Record<string, number> | undefined) ?? {};
}

export function computeSellerTotals(input: SellerTotalsInput): SellerTotals {
  const { sellerKey, subtotal, productDiscount, couponDiscount, firstProduct, deliverySelections } = input;
  const effectiveSubtotal = subtotal - productDiscount;
  const afterAllDiscounts = effectiveSubtotal - couponDiscount;
  const tax = afterAllDiscounts * TAX_RATE;

  const shippingFee = firstProduct.shippingFee;
  const shippingFeeAmounts = plainShippingAmounts(firstProduct.shippingFeeAmounts);
  const shippingOptions = Array.isArray(firstProduct.shippingOptions) ? firstProduct.shippingOptions : [];
  const clientDelivery = deliverySelections[sellerKey]
    ?? Object.values(deliverySelections).find(v => typeof v === 'string' && v.length > 0);
  const selectedDeliveryOption = clientDelivery
    ?? shippingOptions[0]
    ?? Object.keys(shippingFeeAmounts)[0];

  let shipping: number;
  if (shippingFee === 'free') {
    shipping = 0;
  } else if (shippingFee === 'buyer_pays') {
    // An explicit fee, including 0, is the seller's choice; the standard fee applies only when none is configured.
    shipping = (selectedDeliveryOption
      ? shippingFeeAmounts[selectedDeliveryOption]
      : undefined) ?? Object.values(shippingFeeAmounts)[0] ?? STANDARD_SHIPPING_FEE;
  } else {
    shipping = STANDARD_SHIPPING_FEE;
  }

  return {
    effectiveSubtotal,
    afterAllDiscounts,
    tax,
    shipping,
    total: afterAllDiscounts + tax + shipping,
    selectedDeliveryOption,
  };
}
