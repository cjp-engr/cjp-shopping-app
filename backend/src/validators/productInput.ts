import { AppError } from '../middleware/errorHandler.js';

/**
 * Multipart bodies carry arrays and objects as JSON text; a JSON body carries them as they are. Blank text means
 * the field was not sent. Text that is not valid JSON is a client error, not a server error.
 */
export function parseJsonField(field: string, raw: unknown): any {
  if (typeof raw !== 'string') return raw;
  if (raw.trim() === '') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(400, `${field} must be valid JSON.`, 'invalid_product_json');
  }
}

/**
 * Multipart bodies carry numbers as text. Blank text is "not sent" (or, with `blank: 'reject'`, a 400), never 0:
 * `Number('')` is 0, which would silently turn an empty price into a free product. Text that is not a number
 * comes back as NaN, which the model rejects with its own message.
 */
export function parseNumberField(field: string, raw: unknown, blank: 'omit' | 'reject' = 'omit'): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string' && raw.trim() === '') {
    if (blank === 'reject') throw new AppError(400, `${field} cannot be empty.`, 'invalid_product_number');
    return undefined;
  }
  return Number(raw);
}
