export type CheckoutFlow = 'legacy' | 'manual_capture';

export const DRAFT_EXPIRY_MS = 15 * 60 * 1000;

export function checkoutFlow(): CheckoutFlow {
  const value = process.env.CHECKOUT_FLOW ?? 'legacy';
  if (value !== 'legacy' && value !== 'manual_capture') {
    throw new Error(`CHECKOUT_FLOW must be 'legacy' or 'manual_capture' (got '${value}')`);
  }
  return value;
}

export function sellerSeesManualCapture(): boolean {
  return process.env.SELLER_SEES_MANUAL_CAPTURE === 'true';
}

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || !/^\d+$/.test(value.trim())) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** How often the seller-acceptance deadline scanner runs. */
export function acceptanceScanIntervalMs(): number {
  return positiveIntegerFromEnv('ACCEPTANCE_SCAN_INTERVAL_MS', 60 * 1000);
}

/** How often the payment operation worker looks for abandoned capture and release operations. */
export function operationWorkerIntervalMs(): number {
  return positiveIntegerFromEnv('OPERATION_WORKER_INTERVAL_MS', 15 * 1000);
}

/**
 * Whether buyers can submit delivered-item refund requests and sellers can decide them. Reading
 * requests stays available, and already-approved refunds keep settling, when this is off.
 */
export function deliveredRefundsEnabled(): boolean {
  return process.env.DELIVERED_REFUNDS_ENABLED === 'true';
}
