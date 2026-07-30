import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error & { statusCode?: number; code?: number; keyPattern?: Record<string, unknown>; errors?: Record<string, { message: string }> },
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = err.statusCode ?? 500;
  let message = err.message || 'Server Error';

  if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'Field';
    message = `${field} already exists`;
  }

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource ID';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${statusCode}] ${req.method} ${req.originalUrl}`, err.message);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, `Not Found — ${req.originalUrl}`));
};
