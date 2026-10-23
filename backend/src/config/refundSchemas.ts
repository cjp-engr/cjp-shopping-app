const string = { type: 'string' };
const integer = { type: 'integer', minimum: 0 };
const date = { type: 'string', format: 'date-time' };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const response = (properties: object, required: string[]) => ({ type: 'object', properties: { success: { type: 'boolean', enum: [true] }, ...properties }, required: ['success', ...required] });
const reason = { type: 'string', enum: ['damaged', 'wrong_item', 'missing_items', 'not_as_described', 'other'] };
export const refundSchemas = {
  CreateRefundInput: {
    type: 'object', additionalProperties: false, required: ['items', 'reasonCode', 'description', 'idempotencyKey'],
    properties: {
      items: { type: 'array', minItems: 1, maxItems: 1000, items: { type: 'object', additionalProperties: false, required: ['lineId', 'quantity'], properties: { lineId: { type: 'string', minLength: 1, maxLength: 128 }, quantity: { type: 'integer', minimum: 1 } } } },
      reasonCode: reason, description: { type: 'string', minLength: 1, maxLength: 1000 }, idempotencyKey: { type: 'string', minLength: 1, maxLength: 128 },
    },
  },
  RefundDecisionInput: { oneOf: [
    { type: 'object', additionalProperties: false, required: ['decision'], properties: { decision: { type: 'string', enum: ['approve'] } } },
    { type: 'object', additionalProperties: false, required: ['decision', 'rejectionReason'], properties: { decision: { type: 'string', enum: ['reject'] }, rejectionReason: { type: 'string', minLength: 1, maxLength: 1000 } } },
  ] },
  RefundUnit: { type: 'object', required: ['lineId', 'ordinal', 'merchandiseMinor', 'taxMinor'], properties: { lineId: string, ordinal: { type: 'integer', minimum: 1 }, merchandiseMinor: integer, taxMinor: integer, productName: string, productImage: string } },
  RefundRequest: { type: 'object', required: ['id', 'orderId', 'units', 'amountMinor', 'currency', 'state', 'reasonCode', 'description', 'submittedAt'], properties: {
    id: string, orderId: string, units: { type: 'array', items: ref('RefundUnit') }, amountMinor: { type: 'integer', minimum: 1 }, shippingMinor: integer, currency: string,
    state: { type: 'string', enum: ['requested', 'rejected', 'processing', 'refunded', 'needs_review'] }, reasonCode: reason, description: string, submittedAt: date, completedAt: date, decidedAt: date, rejectionReason: string, errorCode: string, canDecide: { type: 'boolean' },
    sellerName: { type: 'string', nullable: true, description: 'Seller display name; only on the buyer Return/Refund list. Null if the seller account is missing.' },
    buyerName: { type: 'string', nullable: true, description: 'Buyer display name; only on the seller refund list. Null if the buyer account is missing.' },
    orderPlacedAt: { ...date, description: 'When the order was placed; only on the buyer and seller refund lists.' },
    orderPaymentStatus: { type: 'string', nullable: true, description: 'Payment status of the whole order (for example refunded or partially_refunded), so a card can say Fully or Partially refunded; only on the buyer and seller refund lists and the seller order refund history.' },
  } },
  RefundEligibility: { type: 'object', required: ['orderId', 'eligible', 'lines'], properties: {
    orderId: string, eligible: { type: 'boolean' }, requestsEnabled: { type: 'boolean' }, reason: string, currency: string, deliveredAt: date, deadlineAt: date, shippingRefundableMinor: integer,
    lines: { type: 'array', items: { type: 'object', required: ['lineId', 'productName', 'quantityOrdered', 'quantityAvailable', 'availableUnitAmountsMinor'], properties: { lineId: string, productName: string, productImage: string, quantityOrdered: integer, quantityAvailable: integer, availableUnitAmountsMinor: { type: 'array', items: integer } } } },
  } },
  RefundEligibilityResponse: response({ eligibility: ref('RefundEligibility') }, ['eligibility']),
  RefundRequestResponse: response({ request: ref('RefundRequest') }, ['request']),
  BuyerRefundRequestsResponse: response({ requests: { type: 'array', items: ref('RefundRequest') } }, ['requests']),
  SellerRefundRequestsResponse: response({ requests: { type: 'array', items: ref('RefundRequest') }, page: { type: 'integer', minimum: 1 }, pages: integer, total: integer, counts: { type: 'object', description: 'Seller list only: how many requests are in each group, whichever group was requested.', properties: { in_progress: integer, approved: integer, rejected: integer } } }, ['requests', 'page', 'pages', 'total']),
};
