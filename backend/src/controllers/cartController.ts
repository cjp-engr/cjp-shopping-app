import { Response } from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { AuthRequest } from '../middleware/auth.js';

// Populate product fields + seller name/avatar within each seller group
const POPULATE = [
  {
    path: 'sellers.items.product',
    populate: { path: 'sellerId', select: 'firstName lastName avatar' },
  },
];

// @desc  Get current user's cart
// @route GET /api/cart
// @access Private
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const cart = await Cart.findOne({ userId: req.user?.id }).populate(POPULATE);

    // Return sellers array so the client can render grouped by seller
    res.json({ success: true, sellers: cart?.sellers ?? [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

// @desc  Sync entire cart — groups items by sellerId before saving
// @route PUT /api/cart
// @access Private
export const syncCart = async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body as { items: { productId: string; quantity: number }[] };

    // Group by sellerId — look up each product to find its seller
    const sellerMap = new Map<string, { productId: string; quantity: number }[]>();

    for (const item of items ?? []) {
      if (item.quantity <= 0) continue;

      const product = await Product.findById(item.productId).select('sellerId');
      const sellerKey = product?.sellerId?.toString() ?? '__unknown__';

      if (!sellerMap.has(sellerKey)) sellerMap.set(sellerKey, []);
      sellerMap.get(sellerKey)!.push(item);
    }

    const sellers = Array.from(sellerMap.entries()).map(([sellerKey, groupItems]) => ({
      sellerId: sellerKey === '__unknown__' ? null : sellerKey,
      items: groupItems.map(i => ({ product: i.productId, quantity: i.quantity })),
    }));

    const cart = await Cart.findOneAndUpdate(
      { userId: req.user?.id },
      { sellers },
      { upsert: true, new: true }
    ).populate(POPULATE);

    res.json({ success: true, sellers: cart?.sellers ?? [] });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

// @desc  Clear cart
// @route DELETE /api/cart
// @access Private
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    await Cart.findOneAndUpdate(
      { userId: req.user?.id },
      { sellers: [] },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};
