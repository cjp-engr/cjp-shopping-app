import { Response } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { AuthRequest } from '../middleware/auth.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order items provided'
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    // Validate products and stock
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}`
        });
      }

      orderItems.push({
        product: product._id,
        productName: product.name,
        productPrice: product.price,
        productImage: product.image,
        quantity: item.quantity
      });

      subtotal += product.price * item.quantity;

      // Decrease product stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Calculate totals
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal >= 50 ? 0 : 9.99; // Free shipping over $50
    const total = subtotal + tax + shipping;

    // Calculate estimated delivery (5-7 business days)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    // Create order
    const order = await Order.create({
      userId: req.user?.id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      tax,
      shipping,
      total,
      estimatedDelivery
    });

    res.status(201).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ userId: req.user?.id })
      .sort({ createdAt: -1 })
      .populate('items.product');

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Make sure user owns this order
    if (order.userId.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (should be Admin only in production)
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow users to cancel their own pending orders
    if (order.userId.toString() === req.user?.id) {
      if (status !== 'cancelled' || order.status !== 'pending') {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel pending orders'
        });
      }
    }

    // If cancelling, restore product stock
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

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
