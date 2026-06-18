import { Response } from 'express';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { AuthRequest } from '../middleware/auth.js';

function buildImageUrls(req: AuthRequest, files: Express.Multer.File[]): string[] {
  const base = `${req.protocol}://${req.get('host')}`;
  return files.map(f => `${base}/uploads/${f.filename}`);
}

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
    const { name, description, price, category, stock, tags } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
    const imageUrls = buildImageUrls(req, uploadedFiles);
    const primaryImage = imageUrls[0] ?? '';

    const product = await Product.create({
      name,
      description,
      price,
      category,
      image: primaryImage,
      images: imageUrls,
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

    const { name, description, price, category, stock, tags } = req.body;
    const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];

    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (category) product.category = category;
    if (stock !== undefined) product.stock = stock;
    if (tags) product.tags = tags;

    if (uploadedFiles.length > 0) {
      const imageUrls = buildImageUrls(req, uploadedFiles);
      product.image = imageUrls[0];
      product.images = imageUrls;
    }

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

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(400).json({ success: false, message: 'Order not found' });
    }

    const sellerProducts = await Product.find({ sellerId: req.user?.id }).select('_id');
    const sellerProductIds = new Set(sellerProducts.map(p => p._id.toString()));

    const hasSellersProduct = order.items.some(item => sellerProductIds.has(item.product.toString()));
    if (!hasSellersProduct) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }

    const validTransitions: Record<string, string[]> = {
      pending:    ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped:    ['delivered', 'cancelled'],
      delivered:  [],
      cancelled:  []
    };

    const allowedNext = validTransitions[order.status] ?? [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition order from '${order.status}' to '${status}'`
      });
    }

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
    if (status === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date();
    }
    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};
