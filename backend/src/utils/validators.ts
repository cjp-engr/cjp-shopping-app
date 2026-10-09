import { Response } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { sendError, ErrorCodes } from './apiResponse.js';

/**
 * Middleware to handle validation errors from express-validator
 * Sends mobile-friendly error response with field-level details
 */
export function handleValidationErrors(req: any, res: Response, next: any) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format validation errors for mobile
    const fieldErrors = errors.array().map((err: any) => ({
      field: err.param || err.path || 'unknown',
      message: err.msg,
    }));

    return sendError(
      res,
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Invalid request data',
      false,
      {
        details: fieldErrors,
      },
    );
  }

  next();
}

/**
 * Create a validation chain with automatic error handling
 */
export function withValidation(...validations: ValidationChain[]) {
  return [
    ...validations,
    handleValidationErrors,
  ];
}

/**
 * Common validation rules for payment endpoints
 */
export const paymentValidations = {
  amountInCents: () => ({
    in: 'body',
    errorMessage: 'Amount must be a positive integer',
    custom: {
      options: (value: unknown) => {
        if (typeof value !== 'number' || value <= 0) {
          throw new Error('Amount must be greater than 0');
        }
        return true;
      },
    },
  }),

  stripePaymentMethodId: () => ({
    in: 'body',
    trim: true,
    notEmpty: { errorMessage: 'Payment method ID is required' },
    isString: { errorMessage: 'Payment method ID must be a string' },
  }),
};

/**
 * Common validation rules for card endpoints
 */
export const cardValidations = {
  type: () => ({
    in: 'body',
    notEmpty: { errorMessage: 'Card type is required' },
    isIn: {
      options: [['credit-card']],
      errorMessage: 'Invalid card type',
    },
  }),

  brand: () => ({
    in: 'body',
    notEmpty: { errorMessage: 'Card brand is required' },
    isIn: {
      options: [['visa', 'mastercard', 'amex', 'unionpay']],
      errorMessage: 'Invalid card brand',
    },
  }),

  last4: () => ({
    in: 'body',
    notEmpty: { errorMessage: 'Last 4 digits are required' },
    matches: {
      options: /^\d{4}$/,
      errorMessage: 'Last 4 digits must be exactly 4 numbers',
    },
  }),

  expiryMonth: () => ({
    in: 'body',
    notEmpty: { errorMessage: 'Expiry month is required' },
    isInt: {
      options: { min: 1, max: 12 },
      errorMessage: 'Expiry month must be between 1 and 12',
    },
  }),

  expiryYear: () => ({
    in: 'body',
    notEmpty: { errorMessage: 'Expiry year is required' },
    isInt: {
      options: { min: new Date().getFullYear() },
      errorMessage: `Expiry year must be ${new Date().getFullYear()} or later`,
    },
  }),

  stripePaymentMethodId: () => ({
    in: 'body',
    optional: true,
    isString: { errorMessage: 'Stripe payment method ID must be a string' },
  }),

  cardHolder: () => ({
    in: 'body',
    optional: true,
    isString: { errorMessage: 'Cardholder name must be a string' },
  }),

  setAsDefault: () => ({
    in: 'body',
    optional: true,
    isBoolean: { errorMessage: 'setAsDefault must be a boolean' },
  }),
};
