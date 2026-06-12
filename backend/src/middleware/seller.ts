import { Response, NextFunction } from 'express';
import User from '../models/User.js';
import { AuthRequest } from './auth.js';

export const requireSeller = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user || user.role !== 'seller') {
      return res.status(403).json({ success: false, message: 'Seller account required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
