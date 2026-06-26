import { Response } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { AuthRequest } from '../middleware/auth.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, shippingAddress, paymentMethod, sellerMessages } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No order items provided' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: 'Shipping address is required' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Payment method is required' });
    }

    // Validate all products first, group by seller
    const sellerGroups = new Map<string, { productDoc: any; quantity: number }[]>();

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for: ${product.name}` });
      }
      const sellerKey = product.sellerId?.toString() ?? '__unknown__';
      if (!sellerGroups.has(sellerKey)) sellerGroups.set(sellerKey, []);
      sellerGroups.get(sellerKey)!.push({ productDoc: product, quantity: item.quantity });
    }

    // Deduct stock and create one order per seller
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    const createdOrders = [];

    for (const [sellerKey, groupItems] of sellerGroups) {
      const orderItems = [];
      let subtotal = 0;

      for (const { productDoc, quantity } of groupItems) {
        orderItems.push({
          product: productDoc._id,
          productName: productDoc.name,
          productPrice: productDoc.price,
          productImage: productDoc.image,
          quantity,
        });
        subtotal += productDoc.price * quantity;
        productDoc.stock -= quantity;
        await productDoc.save();
      }

      const tax = subtotal * 0.08;
      const shipping = subtotal >= 50 ? 0 : 9.99;
      const total = subtotal + tax + shipping;

      const sellerMessage = (sellerMessages && sellerMessages[sellerKey]) ?? '';

      const order = await Order.create({
        userId: req.user?.id,
        items: orderItems,
        shippingAddress,
        paymentMethod,
        subtotal,
        tax,
        shipping,
        total,
        estimatedDelivery,
        sellerMessages: sellerMessage ? { [sellerKey]: sellerMessage } : {},
      });

      createdOrders.push(order);
    }

    res.status(201).json({
      success: true,
      orders: createdOrders,
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
      .populate({
        path: 'items.product',
        populate: { path: 'sellerId', select: 'firstName lastName avatar' },
      });

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
    const order = await Order.findById(req.params.id).populate({
      path: 'items.product',
      populate: { path: 'sellerId', select: 'firstName lastName avatar' },
    });

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

// @desc    Update order status (seller: pending→processing→shipped; buyer: pending→cancelled)
// @route   PUT /api/orders/:id/status
// @access  Private
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    // Sellers may not set delivered — that belongs to the buyer via confirm-received
    const sellerAllowed = ['pending', 'processing', 'shipped', 'cancelled'];
    const buyerAllowed  = ['cancelled'];

    if (!sellerAllowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isBuyer = order.userId.toString() === req.user?.id;

    if (isBuyer) {
      // Buyer can only cancel pending orders via this endpoint
      if (!buyerAllowed.includes(status) || order.status !== 'pending') {
        return res.status(403).json({ success: false, message: 'You can only cancel pending orders' });
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

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Buyer confirms order received → status: delivered
// @route   PUT /api/orders/:id/confirm-received
// @access  Private (buyer only)
export const confirmOrderReceived = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.userId.toString() !== req.user?.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (order.status !== 'shipped') {
      return res.status(400).json({ success: false, message: 'Order must be shipped before confirming receipt' });
    }

    order.status = 'delivered';
    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
