import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as sellerService from '../services/sellerService.js';

function extractImageUrls(files: Express.Multer.File[]): string[] {
  return files.map(f => (f as Express.Multer.File & { path: string }).path || f.filename);
}

export const getSellerProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const products = await sellerService.getSellerProducts(req.user!.id);
    res.status(200).json({ success: true, products });
  } catch (err) { next(err); }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, category, stock, tags, brand, condition, sku, discount, shippingOptions, shippingFee, shippingFeeAmounts, image } = req.body;
    if (!name || !description || price == null || !category) {
      return res.status(400).json({ success: false, message: 'name, description, price, and category are required' });
    }
    const files = (req.files as Express.Multer.File[]) ?? [];
    const parsedShippingOptions = typeof shippingOptions === 'string' ? JSON.parse(shippingOptions) : shippingOptions;
    const parsedFeeAmounts = typeof shippingFeeAmounts === 'string' ? JSON.parse(shippingFeeAmounts) : (shippingFeeAmounts ?? {});
    const product = await sellerService.createSellerProduct(
      req.user!.id,
      { name, description, price: Number(price), category, stock: Number(stock ?? 0), tags, brand, condition, sku, discount: discount != null ? Number(discount) : undefined, shippingOptions: parsedShippingOptions, shippingFee, shippingFeeAmounts: parsedFeeAmounts, image },
      extractImageUrls(files),
    );
    res.status(201).json({ success: true, product });
  } catch (err) { next(err); }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, category, stock, tags, brand, condition, sku, discount, shippingOptions, shippingFee, shippingFeeAmounts, image } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];
    const parsedShippingOptions = typeof shippingOptions === 'string' ? JSON.parse(shippingOptions) : shippingOptions;
    const parsedFeeAmounts = typeof shippingFeeAmounts === 'string' ? JSON.parse(shippingFeeAmounts) : (shippingFeeAmounts ?? {});
    const product = await sellerService.updateSellerProduct(
      req.params.id,
      req.user!.id,
      { name, description, price: price != null ? Number(price) : undefined, category, stock: stock != null ? Number(stock) : undefined, tags, brand, condition, sku, discount: discount != null ? Number(discount) : undefined, shippingOptions: parsedShippingOptions, shippingFee, shippingFeeAmounts: parsedFeeAmounts, image },
      files.length > 0 ? extractImageUrls(files) : undefined,
    );
    res.status(200).json({ success: true, product });
  } catch (err) { next(err); }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await sellerService.deleteSellerProduct(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (err) { next(err); }
};

export const getSellerOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await sellerService.getSellerOrders(req.user!.id);
    res.status(200).json({ success: true, orders });
  } catch (err) { next(err); }
};

export const updateSellerOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, cancelReason } = req.body;
    const order = await sellerService.updateSellerOrderStatus(
      req.params.id,
      req.user!.id,
      status,
      cancelReason,
    );
    res.status(200).json({ success: true, order });
  } catch (err) { next(err); }
};
