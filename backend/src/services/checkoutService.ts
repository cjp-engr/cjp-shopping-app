import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import CheckoutSession, { type ICheckoutSession } from '../models/CheckoutSession.js';
import User from '../models/User.js';
import { DRAFT_EXPIRY_MS } from '../config/checkout.js';
import {
  computeSellerTotals,
  couponDiscountFor,
  findVariant,
  priceLine,
  toMinorUnits,
  type ProductLike,
} from './checkoutPricing.js';

export const CHECKOUT_CURRENCY = 'usd';
const CARD_PAYMENT_TYPES = ['credit-card', 'debit-card'];

export class CheckoutError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'CheckoutError';
    Object.setPrototypeOf(this, CheckoutError.prototype);
  }
}

export interface CheckoutItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  selectedAttributes?: Record<string, string>;
}

export interface CheckoutRequest {
  items: CheckoutItemInput[];
  shippingAddress: Record<string, unknown>;
  paymentMethod: { type: string; last4?: string; cardHolder?: string };
  sellerMessages: Record<string, string>;
  couponCodes: Record<string, string>;
  deliverySelections: Record<string, string>;
  savedPaymentMethodId?: string;
}

function invalid(message: string): CheckoutError {
  return new CheckoutError(400, 'invalid_request', message);
}

export function validateCheckoutRequest(body: unknown): CheckoutRequest {
  if (!body || typeof body !== 'object') throw invalid('Request body is required');
  const input = body as Record<string, unknown>;

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw invalid('items must be a non-empty array');
  }
  const items: CheckoutItemInput[] = input.items.map((raw) => {
    const item = raw as Record<string, unknown>;
    if (typeof item.productId !== 'string' || item.productId.length === 0) {
      throw invalid('Each item needs a productId');
    }
    if (!Number.isInteger(item.quantity) || (item.quantity as number) < 1) {
      throw invalid('Each item quantity must be a positive integer');
    }
    if (item.variantId !== undefined && typeof item.variantId !== 'string') {
      throw invalid('variantId must be a string');
    }
    return {
      productId: item.productId,
      variantId: item.variantId as string | undefined,
      quantity: item.quantity as number,
      selectedAttributes: item.selectedAttributes as Record<string, string> | undefined,
    };
  });

  const address = input.shippingAddress;
  if (!address || typeof address !== 'object') throw invalid('shippingAddress is required');

  const payment = input.paymentMethod as Record<string, unknown> | undefined;
  if (!payment || typeof payment.type !== 'string') throw invalid('paymentMethod.type is required');
  if (!CARD_PAYMENT_TYPES.includes(payment.type)) {
    throw new CheckoutError(400, 'unsupported_payment_method', 'Only card payments use checkout sessions');
  }

  return {
    items,
    shippingAddress: address as Record<string, unknown>,
    paymentMethod: {
      type: payment.type,
      last4: typeof payment.last4 === 'string' ? payment.last4 : undefined,
      cardHolder: typeof payment.cardHolder === 'string' ? payment.cardHolder : undefined,
    },
    sellerMessages: (input.sellerMessages as Record<string, string>) ?? {},
    couponCodes: (input.couponCodes as Record<string, string>) ?? {},
    deliverySelections: (input.deliverySelections as Record<string, string>) ?? {},
    savedPaymentMethodId: validSavedPaymentMethodId(input.savedPaymentMethodId),
  };
}

function validSavedPaymentMethodId(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !/^pm_[A-Za-z0-9_]+$/.test(value)) {
    throw invalid('savedPaymentMethodId must be a Stripe PaymentMethod ID');
  }
  return value;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as object)
      .filter(key => (value as Record<string, unknown>)[key] !== undefined)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function requestHash(request: CheckoutRequest): string {
  const normalized = {
    ...request,
    items: [...request.items]
      .map(item => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
        selectedAttributes: item.selectedAttributes ?? null,
      }))
      .sort((a, b) => `${a.productId}|${a.variantId}`.localeCompare(`${b.productId}|${b.variantId}`)),
  };
  return crypto.createHash('sha256').update(stableStringify(normalized)).digest('hex');
}

export async function getCheckoutSessionForBuyer(sessionId: string, buyerId: string): Promise<ICheckoutSession> {
  const session = mongoose.isValidObjectId(sessionId)
    ? await CheckoutSession.findOne({ _id: sessionId, buyerId })
    : null;
  if (!session) {
    throw new CheckoutError(404, 'session_not_found', 'Checkout session not found');
  }
  return session;
}

export async function sellerDisplayNames(sellerIds: string[]): Promise<Map<string, string>> {
  const users = await User.find({ _id: { $in: [...new Set(sellerIds)] } }).select('firstName lastName').lean();
  return new Map(users.map(user => [
    user._id.toString(),
    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
  ]));
}

async function findReplay(buyerId: string, idempotencyKey: string, hash: string): Promise<ICheckoutSession | null> {
  const existing = await CheckoutSession.findOne({ buyerId, idempotencyKey });
  if (!existing) return null;
  if (existing.requestHash !== hash) {
    throw new CheckoutError(409, 'idempotency_conflict', 'This Idempotency-Key was already used for a different checkout');
  }
  return existing;
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

async function reserveStock(
  productId: mongoose.Types.ObjectId,
  variantId: string | undefined,
  quantity: number,
  session: mongoose.ClientSession,
): Promise<boolean> {
  const result = variantId
    ? await Product.updateOne(
        { _id: productId, variants: { $elemMatch: { _id: variantId, stock: { $gte: quantity } } } },
        { $inc: { 'variants.$.stock': -quantity, soldCount: quantity } },
        { session },
      )
    : await Product.updateOne(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity, soldCount: quantity } },
        { session },
      );
  return result.modifiedCount === 1;
}

async function reserveAndCreate(
  buyerId: string,
  idempotencyKey: string,
  hash: string,
  request: CheckoutRequest,
  sessionId: mongoose.Types.ObjectId,
  now: Date,
  session: mongoose.ClientSession,
): Promise<ICheckoutSession> {
  const productIds = [...new Set(request.items.map(item => item.productId))];
  const products = await Product.find({ _id: { $in: productIds } }).session(session);
  const productById = new Map(products.map(product => [product._id.toString(), product]));

  const groups = new Map<string, Array<{ product: (typeof products)[number]; item: CheckoutItemInput }>>();
  for (const item of request.items) {
    const product = productById.get(item.productId);
    if (!product) {
      throw new CheckoutError(400, 'product_not_found', `Product not found: ${item.productId}`);
    }
    if (item.variantId && !findVariant(product as unknown as ProductLike, item.variantId)) {
      throw new CheckoutError(400, 'variant_not_found', `Variant not found for: ${product.name}`);
    }
    if (!product.sellerId) {
      throw new CheckoutError(400, 'product_has_no_seller', `Product has no seller: ${product.name}`);
    }
    const sellerKey = product.sellerId.toString();
    if (!groups.has(sellerKey)) groups.set(sellerKey, []);
    groups.get(sellerKey)!.push({ product, item });
  }

  const stockReservations: Array<{ productId: mongoose.Types.ObjectId; variantId?: string; quantity: number }> = [];
  for (const lines of groups.values()) {
    for (const { product, item } of lines) {
      const reserved = await reserveStock(product._id, item.variantId, item.quantity, session);
      if (!reserved) {
        throw new CheckoutError(
          409,
          'insufficient_stock',
          `Insufficient stock for: ${product.name}`,
          { productId: item.productId, variantId: item.variantId ?? null },
        );
      }
      stockReservations.push({ productId: product._id, variantId: item.variantId, quantity: item.quantity });
    }
  }

  const expiresAt = new Date(now.getTime() + DRAFT_EXPIRY_MS);
  const draftOrders: Array<Record<string, unknown>> = [];
  const sellers: Array<Record<string, unknown>> = [];
  const couponReservations: Array<{ couponId: mongoose.Types.ObjectId; sellerId: mongoose.Types.ObjectId }> = [];

  for (const [sellerKey, lines] of groups) {
    let subtotal = 0;
    let productDiscount = 0;
    const items = lines.map(({ product, item }) => {
      const line = priceLine(product as unknown as ProductLike, item.variantId, item.quantity);
      subtotal += line.gross;
      productDiscount += line.itemDiscount;
      return {
        product: line.product,
        variantId: item.variantId,
        selectedAttributes: item.selectedAttributes,
        productName: line.productName,
        productPrice: line.productPrice,
        productImage: line.productImage,
        variantImages: line.variantImages,
        variantSku: line.variantSku,
        discountPercent: line.discountPercent,
        variantDiscount: line.variantDiscount,
        quantity: item.quantity,
      };
    });

    const effectiveSubtotal = subtotal - productDiscount;
    let couponDiscount = 0;
    let couponCode: string | undefined;
    const requestedCode = request.couponCodes[sellerKey];
    if (requestedCode) {
      const coupon = await Coupon.findOne({
        code: requestedCode.toUpperCase(),
        sellerId: sellerKey,
        isActive: true,
      }).session(session);
      if (coupon) {
        couponDiscount = couponDiscountFor(coupon, effectiveSubtotal, now);
        if (couponDiscount > 0) {
          const reserved = await Coupon.findOneAndUpdate(
            {
              _id: coupon._id,
              $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
            },
            { $inc: { usedCount: 1 } },
            { session, new: true },
          );
          if (!reserved) {
            throw new CheckoutError(409, 'coupon_unavailable', 'This coupon is no longer available', { code: coupon.code });
          }
          couponCode = coupon.code;
          couponReservations.push({ couponId: coupon._id, sellerId: coupon.sellerId });
        }
      }
    }

    const totals = computeSellerTotals({
      sellerKey,
      subtotal,
      productDiscount,
      couponDiscount,
      firstProduct: lines[0].product as unknown as ProductLike,
      deliverySelections: request.deliverySelections,
    });
    const amountMinor = toMinorUnits(totals.total, CHECKOUT_CURRENCY);
    const draftId = new mongoose.Types.ObjectId();

    draftOrders.push({
      _id: draftId,
      userId: buyerId,
      items,
      shippingAddress: request.shippingAddress,
      paymentMethod: request.paymentMethod,
      subtotal,
      productDiscount,
      discount: couponDiscount,
      couponCode,
      tax: totals.tax,
      shipping: totals.shipping,
      total: totals.total,
      status: 'awaiting_payment',
      paymentFlowVersion: 'manual_capture',
      checkoutSessionId: sessionId.toString(),
      sellerId: sellerKey,
      amountMinor,
      currency: CHECKOUT_CURRENCY,
      sellerMessages: request.sellerMessages[sellerKey] ? { [sellerKey]: request.sellerMessages[sellerKey] } : {},
      deliverySelections: totals.selectedDeliveryOption ? { [sellerKey]: totals.selectedDeliveryOption } : {},
      selectedDeliveryOption: totals.selectedDeliveryOption,
    });
    sellers.push({
      sellerId: sellerKey,
      draftOrderId: draftId,
      amountMinor,
      currency: CHECKOUT_CURRENCY,
      status: 'awaiting_authorization',
    });
  }

  await Order.create(draftOrders, { session, ordered: true });
  const [created] = await CheckoutSession.create(
    [{
      _id: sessionId,
      buyerId,
      idempotencyKey,
      requestHash: hash,
      status: 'open',
      expiresAt,
      sellers,
      stockReservations,
      couponReservations,
    }],
    { session },
  );
  return created;
}

export async function createCheckoutSession(
  buyerId: string,
  idempotencyKey: string,
  body: unknown,
  now: Date = new Date(),
): Promise<{ session: ICheckoutSession; replayed: boolean }> {
  const request = validateCheckoutRequest(body);
  const hash = requestHash(request);

  const existing = await findReplay(buyerId, idempotencyKey, hash);
  if (existing) return { session: existing, replayed: true };

  const sessionId = new mongoose.Types.ObjectId();
  const transaction = await mongoose.startSession();
  try {
    let created: ICheckoutSession | undefined;
    await transaction.withTransaction(async () => {
      created = await reserveAndCreate(buyerId, idempotencyKey, hash, request, sessionId, now, transaction);
    });
    return { session: created!, replayed: false };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const winner = await findReplay(buyerId, idempotencyKey, hash);
      if (winner) return { session: winner, replayed: true };
    }
    throw err;
  } finally {
    await transaction.endSession();
  }
}
