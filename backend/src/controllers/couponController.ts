import { Response } from 'express';
import Coupon from '../models/Coupon.js';
import { AuthRequest } from '../middleware/auth.js';

// ── Seller: list own coupons ─────────────────────────────────────────────────
export const getSellerCoupons = async (req: AuthRequest, res: Response) => {
  try {
    const coupons = await Coupon.find({ sellerId: req.user!.id }).sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// ── Seller: create coupon ────────────────────────────────────────────────────
export const createCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { code, discountType, discountValue, maxDiscount, minOrderAmount, expiresAt, usageLimit, description } = req.body;

    if (!code || !discountType || discountValue == null) {
      return res.status(400).json({ success: false, message: 'code, discountType, and discountValue are required' });
    }

    const exists = await Coupon.findOne({ code: code.toString().toUpperCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Coupon code already exists' });
    }

    const coupon = await Coupon.create({
      code,
      sellerId: req.user!.id,
      discountType,
      discountValue,
      maxDiscount,
      minOrderAmount: minOrderAmount ?? 0,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      usageLimit,
      description,
    });

    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// ── Seller: update coupon ────────────────────────────────────────────────────
export const updateCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, sellerId: req.user!.id });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    const allowed = ['discountType', 'discountValue', 'maxDiscount', 'minOrderAmount', 'expiresAt', 'usageLimit', 'isActive', 'description'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (coupon as any)[key] = key === 'expiresAt' && req.body[key] ? new Date(req.body[key]) : req.body[key];
      }
    }

    await coupon.save();
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// ── Seller: delete coupon ────────────────────────────────────────────────────
export const deleteCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, sellerId: req.user!.id });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// ── Buyer: validate a coupon code for a seller ───────────────────────────────
// POST /api/coupons/validate  { code, sellerId, orderAmount }
export const validateCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const { code, sellerId, orderAmount } = req.body;
    if (!code || !sellerId) {
      return res.status(400).json({ success: false, message: 'code and sellerId are required' });
    }

    const coupon = await Coupon.findOne({ code: code.toString().toUpperCase(), sellerId });
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid voucher code' });
    if (!coupon.isActive) return res.status(400).json({ success: false, message: 'This voucher is no longer active' });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This voucher has expired' });
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'This voucher has reached its usage limit' });
    }
    if (orderAmount != null && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is $${coupon.minOrderAmount.toFixed(2)}`,
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount ?? 0) * (coupon.discountValue / 100);
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    } else {
      discountAmount = coupon.discountValue;
    }

    res.json({
      success: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
        description: coupon.description,
      },
      discountAmount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// ── Buyer: list all available coupons for a seller ───────────────────────────
// GET /api/coupons?sellerId=xxx&orderAmount=100
export const getAvailableCoupons = async (req: AuthRequest, res: Response) => {
  try {
    const { sellerId, orderAmount } = req.query;
    if (!sellerId) return res.status(400).json({ success: false, message: 'sellerId is required' });

    const now = new Date();
    const filter: any = {
      sellerId,
      isActive: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }, { expiresAt: null }],
      $and: [
        { $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
      ],
    };

    if (orderAmount) {
      filter.minOrderAmount = { $lte: Number(orderAmount) };
    }

    const coupons = await Coupon.find(filter).sort({ discountValue: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};
