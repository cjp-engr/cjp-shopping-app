import jwt from 'jsonwebtoken';

export const generateToken = (payload: { id: string; email: string }): string => {
  const secret: string = process.env.JWT_SECRET || 'fallback-secret';
  const expiresIn: string | number = process.env.JWT_EXPIRES_IN || '7d';

  // @ts-ignore - jwt.sign types are overly strict
  return jwt.sign(payload, secret, { expiresIn });
};
