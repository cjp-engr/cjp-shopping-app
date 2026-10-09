import { Response } from 'express';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfterSeconds?: number;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  _requestId?: string;
}

/**
 * Send a structured success response to mobile clients
 */
export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  data: T,
  requestId?: string,
): Response {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (requestId) {
    response._requestId = requestId;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a structured error response to mobile clients
 */
export function sendError(
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string,
  retryable: boolean,
  options?: {
    retryAfterSeconds?: number;
    details?: unknown;
    requestId?: string;
  },
): Response {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      retryable,
    },
  };

  if (options?.retryAfterSeconds) {
    response.error.retryAfterSeconds = options.retryAfterSeconds;
  }

  if (options?.details) {
    response.error.details = options.details;
  }

  if (options?.requestId) {
    (response as any)._requestId = options.requestId;
  }

  return res.status(statusCode).json(response);
}

/**
 * Determine if an HTTP status code indicates a retryable error
 */
export function isRetryable(statusCode: number): boolean {
  // 5xx errors are retryable (server error, likely temporary)
  // 429 is retryable (rate limited)
  // 4xx errors are NOT retryable (client error, won't change)
  return statusCode >= 500 || statusCode === 429;
}

/**
 * Common error codes for mobile to handle
 */
export const ErrorCodes = {
  // Validation errors (4xx)
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_CARD_DATA: 'INVALID_CARD_DATA',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Authentication errors (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // Payment-specific errors (4xx-5xx)
  CARD_NOT_FOUND: 'CARD_NOT_FOUND',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CARD_DECLINED: 'CARD_DECLINED',
  STRIPE_ERROR: 'STRIPE_ERROR',
  CART_NOT_FOUND: 'CART_NOT_FOUND',

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
} as const;
