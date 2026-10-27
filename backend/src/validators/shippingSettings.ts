import { AppError } from '../middleware/errorHandler.js';

export const DELIVERY_OPTIONS = ['standard', 'express', 'pickup'] as const;

interface ShippingSettingsInput {
  shippingOptions?: unknown;
  shippingFee?: unknown;
  shippingFeeAmounts?: unknown;
}

/** A fee is a finite number, or a numeric string as multipart bodies send it. Empty text is not a number. */
function parseFee(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

/**
 * The shipping settings every product must carry: at least one known delivery option, a fee option, and a fee
 * for each selected option when the buyer pays. Returns the first problem as a message, or null when valid.
 * Used by both product route sets so they enforce the same rule.
 */
export function validateShippingSettings({ shippingOptions, shippingFee, shippingFeeAmounts }: ShippingSettingsInput): string | null {
  if (!Array.isArray(shippingOptions) || shippingOptions.length === 0) return 'At least one delivery option is required.';
  for (const option of shippingOptions) {
    if (!(DELIVERY_OPTIONS as readonly unknown[]).includes(option)) {
      return `Unknown delivery option "${String(option)}". Use ${DELIVERY_OPTIONS.slice(0, -1).join(', ')} or ${DELIVERY_OPTIONS[DELIVERY_OPTIONS.length - 1]}.`;
    }
  }

  if (!shippingFee) return 'Shipping fee option is required.';
  if (shippingFee !== 'free' && shippingFee !== 'buyer_pays') return 'Shipping fee must be "free" or "buyer_pays".';

  if (shippingFee === 'buyer_pays') {
    const amounts = (shippingFeeAmounts ?? {}) as Record<string, unknown>;
    for (const option of shippingOptions as string[]) {
      const fee = parseFee(amounts[option]);
      if (fee === null) return `Shipping fee amount is required for delivery option "${option}".`;
      if (fee < 0) return `Shipping fee amount for "${option}" cannot be negative.`;
    }
  }

  return null;
}

/** Throws the API error for invalid shipping settings. The code lives here so services only call it. */
export function assertValidShippingSettings(input: ShippingSettingsInput): void {
  const message = validateShippingSettings(input);
  if (message) throw new AppError(400, message, 'invalid_shipping_settings');
}
