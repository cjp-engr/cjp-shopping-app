import { describe, expect, it } from 'vitest';
import { assertValidShippingSettings, validateShippingSettings } from '../shippingSettings.js';

describe('validateShippingSettings', () => {
  it('accepts free shipping with at least one known delivery option', () => {
    expect(validateShippingSettings({ shippingOptions: ['standard'], shippingFee: 'free' })).toBeNull();
    expect(validateShippingSettings({ shippingOptions: ['standard', 'express', 'pickup'], shippingFee: 'free' })).toBeNull();
  });

  it('accepts buyer-pays when every selected option has a fee, including an explicit 0', () => {
    expect(validateShippingSettings({
      shippingOptions: ['standard', 'pickup'],
      shippingFee: 'buyer_pays',
      shippingFeeAmounts: { standard: 5, pickup: 0 },
    })).toBeNull();
  });

  it('accepts numeric strings for amounts, as multipart bodies send them', () => {
    expect(validateShippingSettings({
      shippingOptions: ['standard'], shippingFee: 'buyer_pays', shippingFeeAmounts: { standard: '4.5' },
    })).toBeNull();
  });

  it('requires at least one delivery option', () => {
    const message = 'At least one delivery option is required.';
    expect(validateShippingSettings({ shippingFee: 'free' })).toBe(message);
    expect(validateShippingSettings({ shippingOptions: [], shippingFee: 'free' })).toBe(message);
    expect(validateShippingSettings({ shippingOptions: 'standard', shippingFee: 'free' })).toBe(message);
  });

  it('rejects an unknown delivery option', () => {
    expect(validateShippingSettings({ shippingOptions: ['standard', 'drone'], shippingFee: 'free' }))
      .toBe('Unknown delivery option "drone". Use standard, express or pickup.');
  });

  it('requires the shipping fee option', () => {
    expect(validateShippingSettings({ shippingOptions: ['standard'] })).toBe('Shipping fee option is required.');
    expect(validateShippingSettings({ shippingOptions: ['standard'], shippingFee: '' })).toBe('Shipping fee option is required.');
  });

  it('accepts only free or buyer_pays as the fee option', () => {
    expect(validateShippingSettings({ shippingOptions: ['standard'], shippingFee: 'flat' }))
      .toBe('Shipping fee must be "free" or "buyer_pays".');
  });

  it('requires a fee for every selected option when the buyer pays', () => {
    expect(validateShippingSettings({
      shippingOptions: ['standard', 'express'], shippingFee: 'buyer_pays', shippingFeeAmounts: { standard: 5 },
    })).toBe('Shipping fee amount is required for delivery option "express".');
    expect(validateShippingSettings({ shippingOptions: ['standard'], shippingFee: 'buyer_pays' }))
      .toBe('Shipping fee amount is required for delivery option "standard".');
  });

  it.each([['an empty string', ''], ['spaces', '  '], ['text', 'abc'], ['null', null], ['NaN', NaN], ['a boolean', true]])(
    'rejects %s as a fee amount',
    (_label, amount) => {
      expect(validateShippingSettings({
        shippingOptions: ['standard'], shippingFee: 'buyer_pays', shippingFeeAmounts: { standard: amount as never },
      })).toBe('Shipping fee amount is required for delivery option "standard".');
    },
  );

  it('rejects a negative fee amount', () => {
    expect(validateShippingSettings({
      shippingOptions: ['standard'], shippingFee: 'buyer_pays', shippingFeeAmounts: { standard: -1 },
    })).toBe('Shipping fee amount for "standard" cannot be negative.');
  });

  it('ignores fee amounts when shipping is free', () => {
    expect(validateShippingSettings({
      shippingOptions: ['standard'], shippingFee: 'free', shippingFeeAmounts: { standard: -5 },
    })).toBeNull();
  });
});

describe('assertValidShippingSettings', () => {
  it('does nothing for valid settings', () => {
    expect(() => assertValidShippingSettings({ shippingOptions: ['standard'], shippingFee: 'free' })).not.toThrow();
  });

  it('throws a 400 invalid_shipping_settings error carrying the first problem', () => {
    expect(() => assertValidShippingSettings({ shippingFee: 'free' })).toThrowError(
      expect.objectContaining({ statusCode: 400, code: 'invalid_shipping_settings', message: 'At least one delivery option is required.' }),
    );
  });
});
