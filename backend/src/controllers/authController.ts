import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as authService from '../services/authService.js';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const result = await authService.signupUser({ email, password, firstName, lastName });
    res.status(201).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getUserById(req.user!.id);
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};

export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }
    const avatarUrl = (req.file as Express.Multer.File & { path: string }).path;
    const user = await authService.setAvatarUrl(req.user!.id, avatarUrl);
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, avatar, email, address } = req.body;
    // Only allow explicit opt-in to seller — role demotion not permitted
    const becomeSeller = req.body.role === 'seller';
    const user = await authService.updateUserProfile(req.user!.id, {
      firstName, lastName, phone, avatar, email, address, becomeSeller,
    });
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};

export const getPaymentMethods = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user!.id).select('savedCards');
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    res.json({ success: true, paymentMethods: user.savedCards });
  } catch (err) { next(err); }
};

export const addPaymentMethod = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { type, last4, cardHolder, expiryMonth, expiryYear, setAsDefault } = req.body;
    if (!type || !last4 || !cardHolder || !expiryMonth || !expiryYear) {
      return res.status(400).json({ success: false, message: 'Missing required card fields' });
    }

    const duplicate = user.savedCards.find(
      c => c.last4 === last4 && c.expiryMonth === expiryMonth && c.expiryYear === expiryYear,
    );
    if (duplicate) return res.json({ success: true, paymentMethods: user.savedCards });

    if (setAsDefault) user.savedCards.forEach(c => { c.isDefault = false; });
    user.savedCards.push({ type, last4, cardHolder, expiryMonth, expiryYear,
      isDefault: setAsDefault || user.savedCards.length === 0 });
    await user.save();
    res.status(201).json({ success: true, paymentMethods: user.savedCards });
  } catch (err) { next(err); }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const before = user.savedCards.length;
    user.savedCards = user.savedCards.filter(c => c._id?.toString() !== req.params.id);
    if (user.savedCards.length === before) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }
    if (user.savedCards.length > 0 && !user.savedCards.some(c => c.isDefault)) {
      user.savedCards[0].isDefault = true;
    }
    await user.save();
    res.json({ success: true, paymentMethods: user.savedCards });
  } catch (err) { next(err); }
};

export const getSavedAddresses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user!.id).select('savedAddresses');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch (err) { next(err); }
};

export const addSavedAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User.js')).default;
    const { label, street, city, state, zipCode, country, setAsDefault } = req.body;
    if (!street || !city) {
      return res.status(400).json({ success: false, message: 'street and city are required' });
    }

    // Check current address count to determine auto-default before any mutation
    const existing = await User.findById(req.user!.id).select('savedAddresses');
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    const shouldBeDefault = setAsDefault || existing.savedAddresses.length === 0;

    // If this address should be default, clear all existing defaults first (atomic)
    if (shouldBeDefault) {
      await User.updateOne({ _id: req.user!.id }, { $set: { 'savedAddresses.$[].isDefault': false } });
    }

    // $push is atomic — safe against concurrent adds that would cause lost updates
    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      { $push: { savedAddresses: { label: label || 'Home', street, city, state: state || '', zipCode: zipCode || '', country: country || '', isDefault: shouldBeDefault } } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(201).json({ success: true, savedAddresses: updated.savedAddresses });
  } catch (err) { next(err); }
};

export const deleteSavedAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const before = user.savedAddresses.length;
    user.savedAddresses = user.savedAddresses.filter(a => a._id?.toString() !== req.params.id);
    if (user.savedAddresses.length === before) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    if (user.savedAddresses.length > 0 && !user.savedAddresses.some(a => a.isDefault)) {
      user.savedAddresses[0].isDefault = true;
    }
    await user.save();
    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch (err) { next(err); }
};

export const setDefaultAddress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.savedAddresses.forEach(a => { a.isDefault = a._id?.toString() === req.params.id; });
    await user.save();
    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch (err) { next(err); }
};
