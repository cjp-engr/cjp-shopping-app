import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import Order, { type IOrder } from '../models/Order.js';
import User from '../models/User.js';
import RefundRequest, { REFUND_REASON_CODES, type IRefundRequest, type RefundReasonCode } from '../models/RefundRequest.js';
import PaymentOperation from '../models/PaymentOperation.js';
import { AppError } from '../middleware/errorHandler.js';
import { deliveredRefundsEnabled } from '../config/checkout.js';
import { ensureRefundAllocation, getRefundEligibility } from './refundEligibility.js';
import { refundableUnits, lineIdFor } from './refundAllocation.js';
import { isSellerVisibleOrder, sellerVisibleOrderFilter } from './orderVisibility.js';
import { shippingForRefundSelection, shippingHistoryEligible, validRefundAccounting } from './refundShipping.js';
import type { RefundAllocationV1 } from './refundAllocation.js';

export interface CreateRefundInput {
  items: Array<{ lineId: string; quantity: number }>;
  reasonCode: RefundReasonCode;
  description: string;
  idempotencyKey: string;
}
export interface RefundDecisionInput { decision: 'approve' | 'reject'; rejectionReason?: string }

export function refundRequestView(request: IRefundRequest) {
  return {
    id: request.id as string, orderId: request.orderId.toString(),
    units: request.units.map(u => ({ lineId: u.lineId, ordinal: u.ordinal, merchandiseMinor: u.merchandiseMinor, taxMinor: u.taxMinor, ...(u.productName ? { productName: u.productName } : {}), ...(u.productImage ? { productImage: u.productImage } : {}) })),
    amountMinor: request.amountMinor, currency: request.currency, state: request.state,
    shippingMinor: request.shippingMinor ?? 0,
    canDecide: deliveredRefundsEnabled() && request.state === 'requested',
    reasonCode: request.reasonCode, description: request.description, submittedAt: request.submittedAt,
    ...(request.state === 'refunded' ? { completedAt: request.updatedAt } : {}),
    ...(request.decidedAt ? { decidedAt: request.decidedAt } : {}),
    ...(request.rejectionReason ? { rejectionReason: request.rejectionReason } : {}),
    ...(request.errorCode ? { errorCode: request.errorCode } : {}),
  };
}
export type RefundRequestView = ReturnType<typeof refundRequestView>;
const notFound = () => new AppError(404, 'Refund request or order not found', 'refund_not_found');
const conflict = (message: string) => new AppError(409, message, 'refund_conflict');
const invalid = () => new AppError(400, 'Invalid refund request', 'refund_validation');
function enabled() {
  if (!deliveredRefundsEnabled()) throw new AppError(409, 'Delivered refunds are not enabled', 'delivered_refunds_disabled');
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function onlyKeys(value: Record<string, unknown>, keys: string[]) { return Object.keys(value).every(k => keys.includes(k)); }
function text(value: unknown, max = 1000): value is string { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max; }
function validateInput(input: CreateRefundInput): CreateRefundInput {
  if (!object(input) || !onlyKeys(input, ['items', 'reasonCode', 'description', 'idempotencyKey'])
      || !text(input.description) || !text(input.idempotencyKey, 128) || !REFUND_REASON_CODES.includes(input.reasonCode)
      || !Array.isArray(input.items) || !input.items.length || input.items.length > 1000) throw invalid();
  const seen = new Set<string>();
  for (const item of input.items) {
    if (!object(item) || !onlyKeys(item, ['lineId', 'quantity']) || !text(item.lineId, 128)
        || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || seen.has(item.lineId)) throw invalid();
    seen.add(item.lineId);
  }
  return { items: [...input.items].sort((a, b) => a.lineId.localeCompare(b.lineId)), reasonCode: input.reasonCode,
    description: input.description.trim(), idempotencyKey: input.idempotencyKey.trim() };
}
function fingerprint(orderId: string, input: CreateRefundInput) {
  return createHash('sha256').update(JSON.stringify({ orderId: orderId.toLowerCase(), items: input.items, reasonCode: input.reasonCode, description: input.description })).digest('hex');
}
async function replay(buyerId: string, key: string, hash: string) {
  const existing = await RefundRequest.findOne({ buyerId, idempotencyKey: key });
  if (!existing) return undefined;
  if (existing.payloadHash !== hash) throw conflict('Idempotency key was already used for a different request');
  return refundRequestView(existing);
}
function ids(...values: string[]) { if (values.some(v => !mongoose.isValidObjectId(v))) throw notFound(); }

/** Returns an explicit replay marker so the HTTP boundary can distinguish 200 from 201. */
export async function submitRefundRequest(orderId: string, buyerId: string, raw: CreateRefundInput, now = new Date()): Promise<{ request: RefundRequestView; replayed: boolean }> {
  enabled(); ids(orderId, buyerId);
  const input = validateInput(raw); const hash = fingerprint(orderId, input);
  const existing = await replay(buyerId, input.idempotencyKey, hash);
  if (existing) return { request: existing, replayed: true };
  const eligibility = await getRefundEligibility(orderId, buyerId, now);
  if (!eligibility.eligible) {
    const winner = await replay(buyerId, input.idempotencyKey, hash);
    if (winner) return { request: winner, replayed: true };
    throw conflict(`Refund unavailable: ${eligibility.reason}`);
  }
  const session = await mongoose.startSession();
  let result: IRefundRequest | undefined;
  try {
    await session.withTransaction(async () => {
      const o = await Order.findOne({ _id: orderId, userId: buyerId, status: 'delivered' }).session(session);
      if (!o) throw notFound();
      if (o.activeRefundRequestId || !o.refundRequestDeadlineAt || now > o.refundRequestDeadlineAt) throw conflict('Refund window or active request changed');
      const allocation = await ensureRefundAllocation(o, session);
      if (!allocation || !o.sellerId || !o.paymentIntentId || !['captured', 'partially_refunded'].includes(o.paymentStatus ?? '')
          || !['credit-card', 'debit-card'].includes(o.paymentMethod.type) || o.refundId) throw conflict('Order payment needs review');
      validateBalance(o, allocation);
      const available = refundableUnits(allocation, o.refundUnitsTaken ?? []);
      const units = input.items.flatMap(item => {
        const choices = available.filter(u => u.lineId === item.lineId);
        if (choices.length < item.quantity) throw conflict('Requested quantities are not available');
        return choices.slice(0, item.quantity).map(u => {
          const snapshot = o.items.find((i, index) => lineIdFor(i, index) === u.lineId);
          return { ...u, productName: snapshot?.productName, productImage: snapshot?.productImage };
        });
      });
      const shippingMinor = await shippingHistoryEligible(o, session) ? shippingForRefundSelection(allocation, o, units, input.reasonCode) : 0;
      const amountMinor = units.reduce((sum, u) => sum + u.merchandiseMinor + u.taxMinor, shippingMinor);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor + (o.refundedAmountMinor ?? 0) + (o.refundReservedAmountMinor ?? 0) > allocation.capturedAmountMinor) throw conflict('Refund balance needs review');
      const requestId = new mongoose.Types.ObjectId();
      const claimed = await Order.updateOne({ _id: o._id, activeRefundRequestId: null, status: 'delivered' }, { $set: { activeRefundRequestId: requestId } }, { session });
      if (claimed.modifiedCount !== 1) throw conflict('Another request already owns this order');
      [result] = await RefundRequest.create([{
        _id: requestId, orderId: o._id, buyerId, sellerId: o.sellerId, units, amountMinor, shippingMinor, currency: allocation.currency,
        allocationVersion: allocation.version, reasonCode: input.reasonCode, description: input.description,
        idempotencyKey: input.idempotencyKey, payloadHash: hash, state: 'requested', submittedAt: now,
      }], { session });
    });
  } catch (error) {
    // Both an order claim conflict and the unique index can be a concurrent replay.
    const winner = await replay(buyerId, input.idempotencyKey, hash);
    if (winner) return { request: winner, replayed: true };
    if ((error as { code?: number }).code === 11000) throw conflict('Another refund request already exists');
    throw error;
  } finally { await session.endSession(); }
  return { request: refundRequestView(result!), replayed: false };
}

export async function createRefundRequest(orderId: string, buyerId: string, input: CreateRefundInput, now = new Date()): Promise<RefundRequestView> {
  return (await submitRefundRequest(orderId, buyerId, input, now)).request;
}

function validateBalance(o: IOrder, allocation: RefundAllocationV1) {
  if (!validRefundAccounting(allocation, o)) throw conflict('Refund allocation and balance do not agree');
}

export async function decideRefundRequest(requestId: string, sellerId: string, input: RefundDecisionInput, now = new Date()): Promise<RefundRequestView> {
  enabled(); ids(requestId, sellerId);
  if (!object(input) || !onlyKeys(input, ['decision', 'rejectionReason']) || !['approve', 'reject'].includes(input.decision)
      || (input.decision === 'reject' && !text(input.rejectionReason))
      || (input.decision === 'approve' && input.rejectionReason !== undefined)) throw invalid();
  const session = await mongoose.startSession();
  let result: IRefundRequest | undefined;
  try {
    await session.withTransaction(async () => {
      const r = await RefundRequest.findOne({ _id: requestId, sellerId }).session(session);
      if (!r) throw notFound();
      const o = await Order.findOne({ _id: r.orderId, sellerId, userId: r.buyerId }).session(session);
      if (!o || !isSellerVisibleOrder(o)) throw notFound();
      if (r.state !== 'requested') {
        if ((input.decision === 'approve' && ['processing', 'refunded', 'needs_review'].includes(r.state))
            || (input.decision === 'reject' && r.state === 'rejected')) { result = r; return; }
        throw conflict('A different decision already won');
      }
      if (o.activeRefundRequestId?.toString() !== r.id || o.status !== 'delivered') throw conflict('Order no longer owns this request');
      const decision = { decidedAt: now, decidedBySellerId: new mongoose.Types.ObjectId(sellerId) };
      if (input.decision === 'reject') {
        result = (await RefundRequest.findOneAndUpdate({ _id: r._id, state: 'requested' }, { $set: { ...decision, state: 'rejected', rejectionReason: input.rejectionReason!.trim() } }, { new: true, session }))!;
        await Order.updateOne({ _id: o._id, activeRefundRequestId: r._id }, { $unset: { activeRefundRequestId: '' } }, { session });
        return;
      }
      const allocation = await ensureRefundAllocation(o, session);
      if (!allocation || !o.paymentIntentId || !['credit-card', 'debit-card'].includes(o.paymentMethod.type)
          || !['captured', 'partially_refunded'].includes(o.paymentStatus ?? '') || o.refundId
          || allocation.version !== r.allocationVersion || allocation.currency !== r.currency) throw conflict('Order payment needs review');
      validateBalance(o, allocation);
      const available = refundableUnits(allocation, o.refundUnitsTaken ?? []);
      const seen = new Set<string>(); let amount = 0;
      for (const u of r.units) {
        const key = `${u.lineId}#${u.ordinal}`;
        const quoted = available.find(a => a.lineId === u.lineId && a.ordinal === u.ordinal);
        if (!quoted || seen.has(key) || quoted.merchandiseMinor !== u.merchandiseMinor || quoted.taxMinor !== u.taxMinor) throw conflict('Quoted units changed');
        seen.add(key); amount += quoted.merchandiseMinor + quoted.taxMinor;
      }
      const shipping = r.shippingMinor ?? 0;
      const expectedShipping = await shippingHistoryEligible(o, session) ? shippingForRefundSelection(allocation, o, r.units, r.reasonCode) : 0;
      if (r.shippingMinor !== undefined && r.shippingMinor !== expectedShipping) throw conflict('Quoted shipping changed');
      amount += shipping;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount !== r.amountMinor
          || amount + (o.refundedAmountMinor ?? 0) + (o.refundReservedAmountMinor ?? 0) > allocation.capturedAmountMinor) throw conflict('Quoted amount changed');
      const key = `refund-request:${r.id}:refund:1`;
      result = (await RefundRequest.findOneAndUpdate({ _id: r._id, state: 'requested' }, { $set: { ...decision, state: 'processing', paymentOperationKey: key } }, { new: true, session }))!;
      await Order.updateOne({ _id: o._id, activeRefundRequestId: r._id, status: 'delivered' }, {
        $inc: { refundReservedAmountMinor: amount, refundReservedShippingMinor: shipping }, $push: { refundUnitsTaken: { $each: r.units.map(u => ({ lineId: u.lineId, ordinal: u.ordinal })) } },
      }, { session });
      await PaymentOperation.create([{ action: 'refund', refundPurpose: 'delivered_items', refundRequestId: r._id,
        orderId: o._id, paymentIntentId: o.paymentIntentId, amountMinor: amount, currency: r.currency, idempotencyKey: key }], { session });
    });
  } finally { await session.endSession(); }
  return refundRequestView(result!);
}

export async function listBuyerRefundRequests(orderId: string, buyerId: string): Promise<RefundRequestView[]> {
  ids(orderId, buyerId);
  if (!await Order.exists({ _id: orderId, userId: buyerId, status: { $ne: 'awaiting_payment' } })) throw notFound();
  return (await RefundRequest.find({ orderId, buyerId }).sort({ submittedAt: -1, _id: -1 })).map(refundRequestView);
}
/**
 * The seller's Return/Refund tab groups requests by what the seller has done with them:
 * `in_progress` (not decided yet), `approved` (approved, whether the refund is still processing,
 * needs payment review, or is finished) and `rejected`.
 */
export const SELLER_REFUND_GROUPS = {
  in_progress: ['requested'],
  approved: ['processing', 'needs_review', 'refunded'],
  rejected: ['rejected'],
} as const;
export type SellerRefundGroup = keyof typeof SELLER_REFUND_GROUPS;

export async function listSellerRefundRequests(sellerId: string, page = 1, limit = 20, group?: string) {
  ids(sellerId);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) throw invalid();
  if (group !== undefined && !Object.hasOwn(SELLER_REFUND_GROUPS, group)) throw invalid();
  const orderIds = await Order.find({ sellerId, ...sellerVisibleOrderFilter() }).distinct('_id');
  const base = { sellerId, orderId: { $in: orderIds } };
  // Counts for every group, so the tab can show them whichever group is open.
  const groups = Object.keys(SELLER_REFUND_GROUPS) as SellerRefundGroup[];
  const countValues = await Promise.all(groups.map(g => RefundRequest.countDocuments({ ...base, state: { $in: SELLER_REFUND_GROUPS[g] } })));
  const counts = Object.fromEntries(groups.map((g, i) => [g, countValues[i]])) as Record<SellerRefundGroup, number>;
  const filter = group ? { ...base, state: { $in: SELLER_REFUND_GROUPS[group as SellerRefundGroup] } } : base;
  const total = group ? counts[group as SellerRefundGroup] : countValues.reduce((a, b) => a + b, 0);
  const requests = await RefundRequest.find(filter).sort({ submittedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit);
  return { requests: await sellerRequestViews(requests), page, pages: Math.ceil(total / limit), total, counts };
}

/** The seller's order-style card: the buyer's name and the date the order was placed come with each request. */
async function sellerRequestViews(requests: ReadonlyArray<IRefundRequest>) {
  const [buyers, orders] = await Promise.all([
    User.find({ _id: { $in: [...new Set(requests.map(r => r.buyerId.toString()))] } }).select('firstName lastName').lean(),
    Order.find({ _id: { $in: requests.map(r => r.orderId) } }).select('createdAt paymentStatus').lean(),
  ]);
  const buyerNames = new Map(buyers.map(u => [u._id.toString(), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
  const placedAt = new Map(orders.map(o => [o._id.toString(), o.createdAt]));
  const orderPayment = new Map(orders.map(o => [o._id.toString(), o.paymentStatus ?? null]));
  return requests.map(r => ({
    ...refundRequestView(r),
    buyerName: buyerNames.get(r.buyerId.toString()) || null,
    orderPlacedAt: placedAt.get(r.orderId.toString()),
      orderPaymentStatus: orderPayment.get(r.orderId.toString()) ?? null,
  }));
}

/** One order's refund requests in every state (newest first), for the refund history on the seller's order page. */
export async function listSellerOrderRefundRequests(orderId: string, sellerId: string) {
  ids(orderId, sellerId);
  return sellerRequestViews(await RefundRequest.find({ orderId, sellerId }).sort({ submittedAt: -1, _id: -1 }));
}

const APPROVED_REFUND_STATES = ['processing', 'needs_review', 'refunded'];

/**
 * The buyer's Return/Refund tab: item refunds the seller has approved (still processing, awaiting
 * review, or refunded), independent of the order's payment status. Requests still waiting for the
 * seller, and rejected ones, are not listed; they stay with the order under Completed. The "completed"
 * name is kept so the route and client method do not change.
 */
export async function listCompletedBuyerRefundRequests(buyerId: string, page = 1, limit = 20) {
  ids(buyerId);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) throw invalid();
  const orderIds = await Order.find({ userId: buyerId, status: 'delivered' }).distinct('_id');
  const filter = { buyerId, orderId: { $in: orderIds }, state: { $in: APPROVED_REFUND_STATES } };
  const [total, requests] = await Promise.all([
    RefundRequest.countDocuments(filter), RefundRequest.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
  ]);
  // The tab shows an order-style card: the store name and the date the order was placed come with each refund.
  const [sellers, orders] = await Promise.all([
    User.find({ _id: { $in: [...new Set(requests.map(r => r.sellerId.toString()))] } }).select('firstName lastName').lean(),
    Order.find({ _id: { $in: requests.map(r => r.orderId) } }).select('createdAt paymentStatus').lean(),
  ]);
  const sellerNames = new Map(sellers.map(u => [u._id.toString(), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
  const placedAt = new Map(orders.map(o => [o._id.toString(), o.createdAt]));
  const orderPayment = new Map(orders.map(o => [o._id.toString(), o.paymentStatus ?? null]));
  return {
    requests: requests.map(r => ({
      ...refundRequestView(r),
      sellerName: sellerNames.get(r.sellerId.toString()) || null,
      orderPlacedAt: placedAt.get(r.orderId.toString()),
      orderPaymentStatus: orderPayment.get(r.orderId.toString()) ?? null,
    })),
    page, pages: Math.ceil(total / limit), total,
  };
}
