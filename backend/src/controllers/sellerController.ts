import { Response } from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { AuthRequest } from '../middleware/auth.js';

// @desc    Get seller's products
// @route   GET /api/seller/products
export const getSellerProducts = async (req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find({ sellerId: req.user?.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// @desc    Create a product
// @route   POST /api/seller/products
export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, category, image, stock, tags } = req.body;

    if (!name || !description || !price || !category || !image) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const product = await Product.create({
      name,
      description,
      price,
      category,
      image,
      images: image ? [image] : [],
      stock: stock || 0,
      tags: tags || [],
      sellerId: req.user?.id
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// @desc    Update a product
// @route   PUT /api/seller/products/:id
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.sellerId?.toString() !== req.user?.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }

    const { name, description, price, category, image, stock, tags } = req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (category) product.category = category;
    if (image) { product.image = image; product.images = [image]; }
    if (stock !== undefined) product.stock = stock;
    if (tags) product.tags = tags;

    const updated = await product.save();
    res.status(200).json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/seller/products/:id
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.sellerId?.toString() !== req.user?.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }

    await product.deleteOne();
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// @desc    Get orders containing seller's products
// @route   GET /api/seller/orders
export const getSellerOrders = async (req: AuthRequest, res: Response) => {
  try {
    const sellerProducts = await Product.find({ sellerId: req.user?.id }).select('_id');
    const sellerProductIds = sellerProducts.map(p => p._id.toString());

    const orders = await Order.find({
      'items.product': { $in: sellerProductIds }
    })
      .populate('items.product')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// @desc    Update order status (seller)
// @route   PUT /api/seller/orders/:id/status
export const updateSellerOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['processing', 'shipped', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Allowed: processing, shipped, cancelled' });
    }

    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify seller owns at least one product in this order
    const sellerProducts = await Product.find({ sellerId: req.user?.id }).select('_id');
    const sellerProductIds = new Set(sellerProducts.map(p => p._id.toString()));

    const hasSellersProduct = order.items.some(item => sellerProductIds.has(item.product.toString()));
    if (!hasSellersProduct) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }

    // Restore stock if cancelling
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    order.status = status;
    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};
