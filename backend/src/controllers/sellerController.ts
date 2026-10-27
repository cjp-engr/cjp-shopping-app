import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as sellerService from '../services/sellerService.js';
import { parseJsonField, parseNumberField } from '../validators/productInput.js';

function extractImageUrls(files: Express.Multer.File[]): string[] {
  return files.map(f => (f as Express.Multer.File & { path: string }).path || f.filename);
}

function parseImageUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return [raw]; }
  }
  return Array.isArray(raw) ? raw : [];
}

export const getSellerProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const products = await sellerService.getSellerProducts(req.user!.id);
    res.status(200).json({ success: true, products });
  } catch (err) { next(err); }
};

export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, category, stock, tags, brand, condition, sku, discount, shippingOptions, shippingFee, shippingFeeAmounts, image, imageUrls: rawImageUrls, variantAttributes, variants } = req.body;
    const parsedPrice = parseNumberField('price', price);
    if (!name || !description || parsedPrice === undefined || !category) {
      return res.status(400).json({ success: false, message: 'name, description, price, and category are required' });
    }
    const files = (req.files as Express.Multer.File[]) ?? [];
    const parsedShippingOptions = parseJsonField('shippingOptions', shippingOptions);
    const parsedFeeAmounts = parseJsonField('shippingFeeAmounts', shippingFeeAmounts) ?? {};
    const parsedVariantAttributes = parseJsonField('variantAttributes', variantAttributes);
    const parsedVariants = parseJsonField('variants', variants);
    const allImageUrls = [...extractImageUrls(files), ...parseImageUrls(rawImageUrls)];
    const product = await sellerService.createSellerProduct(
      req.user!.id,
      { name, description, price: parsedPrice, category, stock: parseNumberField('stock', stock) ?? 0, tags, brand, condition, sku, discount: parseNumberField('discount', discount), shippingOptions: parsedShippingOptions, shippingFee, shippingFeeAmounts: parsedFeeAmounts, image, variantAttributes: parsedVariantAttributes, variants: parsedVariants },
      allImageUrls,
    );
    res.status(201).json({ success: true, product });
  } catch (err) { next(err); }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, price, category, stock, tags, brand, condition, sku, discount, shippingOptions, shippingFee, shippingFeeAmounts, image, imageUrls: rawImageUrls, variantAttributes, variants } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];
    const parsedShippingOptions = parseJsonField('shippingOptions', shippingOptions);
    const parsedFeeAmounts = parseJsonField('shippingFeeAmounts', shippingFeeAmounts) ?? {};
    const parsedVariantAttributes = parseJsonField('variantAttributes', variantAttributes);
    const parsedVariants = parseJsonField('variants', variants);
    const linkedUrls = parseImageUrls(rawImageUrls);
    const uploadedUrls = extractImageUrls(files);
    const allImageUrls = uploadedUrls.length > 0 || linkedUrls.length > 0
      ? [...uploadedUrls, ...linkedUrls]
      : undefined;
    const product = await sellerService.updateSellerProduct(
      req.params.id,
      req.user!.id,
      { name, description, price: parseNumberField('price', price, 'reject'), category, stock: parseNumberField('stock', stock, 'reject'), tags, brand, condition, sku, discount: parseNumberField('discount', discount), shippingOptions: parsedShippingOptions, shippingFee, shippingFeeAmounts: parsedFeeAmounts, image, variantAttributes: parsedVariantAttributes, variants: parsedVariants },
      allImageUrls,
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
    const { order, outcome, paymentOperation } = await sellerService.updateSellerOrderStatus(
      req.params.id,
      req.user!.id,
      status,
      cancelReason,
    );
    if (outcome === 'resolving') {
      // The capture is still settling; clients poll the order until it reaches `preparing`.
      return res.status(202).json({ success: true, order, operation: { status: 'resolving' } });
    }
    // A cancelled card order reports where the hold release stands, separately from the capture operation above.
    res.status(200).json({ success: true, order, ...(paymentOperation ? { paymentOperation } : {}) });
  } catch (err) { next(err); }
};
