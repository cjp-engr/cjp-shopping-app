import { Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { AuthRequest } from '../middleware/auth.js';

// POST /api/reviews
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, orderId, rating, comment } = req.body;
    const userId = req.user!.id;

    if (!productId || !orderId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'productId, orderId, rating, and comment are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Verify the order belongs to the user, contains the product, and is delivered
    const order = await Order.findOne({ _id: orderId, userId, status: 'delivered' });
    if (!order) {
      return res.status(403).json({ success: false, message: 'You can only review products from delivered orders' });
    }

    const hasProduct = order.items.some(
      (item: any) => item.product?.id?.toString() === productId || item.product?._id?.toString() === productId
    );
    if (!hasProduct) {
      return res.status(403).json({ success: false, message: 'This product is not in the specified order' });
    }

    // Check for duplicate review
    const existing = await Review.findOne({ userId, productId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product' });
    }

    const review = await Review.create({ userId, productId, orderId, rating, comment });

    // Recalculate product rating average
    const stats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(stats[0].avgRating * 10) / 10,
        reviews: stats[0].count,
      });
    }

    await review.populate('userId', 'firstName lastName avatar');

    return res.status(201).json({ success: true, data: review });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this product' });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/reviews/product/:productId
export const getProductReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const reviews = await Review.find({ productId })
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Review.countDocuments({ productId });

    return res.json({ success: true, data: reviews, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/reviews/:id
export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user!.id;

    if (!rating && !comment) {
      return res.status(400).json({ success: false, message: 'Provide rating or comment to update' });
    }
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const review = await Review.findOne({ _id: id, userId });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found or not yours' });
    }

    if (rating) review.rating = rating;
    if (comment) review.comment = comment.trim();
    await review.save();

    // Recalculate product rating average
    const productId = review.productId.toString();
    const stats = await Review.aggregate([
      { $match: { productId: review.productId } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(productId, {
        rating: Math.round(stats[0].avgRating * 10) / 10,
        reviews: stats[0].count,
      });
    }

    await review.populate('userId', 'firstName lastName avatar');
    return res.json({ success: true, data: review });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/reviews/check/:productId  — did the current user already review?
export const checkUserReview = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;
    const review = await Review.findOne({ userId, productId });
    return res.json({ success: true, hasReviewed: !!review, review: review ?? null });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
