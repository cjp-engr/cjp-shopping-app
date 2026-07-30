import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as orderService from '../services/orderService.js';

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { items, shippingAddress, paymentMethod, sellerMessages, couponCodes } = req.body;
    const orders = await orderService.createOrders({
      userId: req.user!.id,
      items,
      shippingAddress,
      paymentMethod,
      sellerMessages,
      couponCodes,
    });
    res.status(201).json({ success: true, orders });
  } catch (err) { next(err); }
};

export const getOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await orderService.getUserOrders(req.user!.id);
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (err) { next(err); }
};

export const getOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user!.id);
    res.status(200).json({ success: true, order });
  } catch (err) { next(err); }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cancelReason } = req.body;
    // This buyer-facing endpoint only supports cancellation
    const order = await orderService.cancelOrderAsBuyer(req.params.id, req.user!.id, cancelReason);
    res.status(200).json({ success: true, order });
  } catch (err) { next(err); }
};

export const confirmOrderReceived = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.confirmOrderReceived(req.params.id, req.user!.id);
    res.status(200).json({ success: true, order });
  } catch (err) { next(err); }
};
