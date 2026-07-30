import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('_id email');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};
