import { describe, expect, it } from 'vitest';
import { AppError } from '../../middleware/errorHandler.js';
import { parseJsonField, parseNumberField } from '../productInput.js';

describe('parseJsonField', () => {
  it('parses the JSON text a multipart body carries', () => {
    expect(parseJsonField('shippingOptions', '["standard","express"]')).toEqual(['standard', 'express']);
    expect(parseJsonField('shippingFeeAmounts', '{"standard":5}')).toEqual({ standard: 5 });
  });

  it('returns a value that is not text as it is (a JSON body)', () => {
    const value = ['standard'];
    expect(parseJsonField('shippingOptions', value)).toBe(value);
    expect(parseJsonField('shippingOptions', undefined)).toBeUndefined();
    expect(parseJsonField('shippingOptions', null)).toBeNull();
  });

  it('treats blank text as not sent', () => {
    expect(parseJsonField('variants', '')).toBeUndefined();
    expect(parseJsonField('variants', '   ')).toBeUndefined();
  });

  it.each(['["standard"', '{', '[{', 'standard'])('rejects malformed JSON %j with a 400 that names the field', raw => {
    expect(() => parseJsonField('shippingOptions', raw)).toThrow(AppError);
    try {
      parseJsonField('shippingOptions', raw);
    } catch (err) {
      expect(err).toMatchObject({ statusCode: 400, code: 'invalid_product_json', message: 'shippingOptions must be valid JSON.' });
    }
  });
});

describe('parseNumberField', () => {
  it('converts numeric text and keeps numbers', () => {
    expect(parseNumberField('price', '12.5')).toBe(12.5);
    expect(parseNumberField('price', 5)).toBe(5);
    expect(parseNumberField('price', '0')).toBe(0);
  });

  it('treats a missing value as not sent', () => {
    expect(parseNumberField('price', undefined)).toBeUndefined();
    expect(parseNumberField('price', null)).toBeUndefined();
  });

  it('treats blank text as not sent by default, so it never becomes 0', () => {
    expect(parseNumberField('stock', '')).toBeUndefined();
    expect(parseNumberField('stock', '   ')).toBeUndefined();
  });

  it('rejects blank text with a 400 when the field cannot be blank', () => {
    try {
      parseNumberField('price', '', 'reject');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toMatchObject({ statusCode: 400, code: 'invalid_product_number', message: 'price cannot be empty.' });
    }
    expect(() => parseNumberField('price', '  ', 'reject')).toThrow(AppError);
    expect(parseNumberField('price', '3', 'reject')).toBe(3);
  });

  it('leaves text that is not a number as NaN for the model to reject', () => {
    expect(parseNumberField('price', 'abc')).toBeNaN();
  });
});
