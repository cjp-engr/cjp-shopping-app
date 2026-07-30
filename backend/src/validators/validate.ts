import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/** Run after express-validator rule chains — short-circuits with 400 on first error set. */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg as string,
      errors: errors.array(),
    });
  }
  next();
};
