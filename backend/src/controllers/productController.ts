import { Request, Response } from 'express';
import Product from '../models/Product.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import * as sellerService from '../services/sellerService.js';

function parseTags(tags: unknown): string[] | undefined {
  if (!tags) return undefined;
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === 'string') {
    try { const parsed = JSON.parse(tags); if (Array.isArray(parsed)) return parsed.map(String); } catch {}
    return [tags];
  }
  return undefined;
}

// @desc    Get all products with filters
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      rating,
      minReviews,
      search,
      excludeSellerId,
      sort = 'createdAt',
      page = '1',
      limit = '20'
    } = req.query;

    // Build query
    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    if (minReviews) {
      query.reviews = { $gte: Number(minReviews) };
    }

    if (search) {
      query.$text = { $search: search as string };
    }

    if (excludeSellerId) {
      query.sellerId = { $ne: excludeSellerId };
    }

    // Exclude out-of-stock products from buyer listing.
    // A product is in-stock when it has product-level stock OR at least one variant with stock.
    query.$or = [
      { stock: { $gt: 0 } },
      { variants: { $elemMatch: { stock: { $gt: 0 } } } },
    ];

    // Sort options
    let sortOption: any = {};
    switch (sort) {
      case 'price-asc':
        sortOption = { price: 1 };
        break;
      case 'price-desc':
        sortOption = { price: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
      case 'name':
        sortOption = { name: 1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .populate('sellerId', 'firstName lastName avatar');

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('sellerId', 'firstName lastName avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (seller)

function validateProductFields(fields: {
  name?: string;
  category?: string;
  description?: string;
  imageUrls: string[];
  shippingOptions?: string[];
  shippingFee?: string;
  shippingFeeAmounts?: Record<string, number>;
  price?: number;
  stock?: number;
  hasVariants: boolean;
}): string | null {
  const { name, category, description, imageUrls, shippingOptions, shippingFee, shippingFeeAmounts, price, stock, hasVariants } = fields;

  if (!name?.trim()) return 'Product name is required.';
  if (!category?.trim()) return 'Category is required.';
  if (!description?.trim()) return 'Description is required.';
  if (!imageUrls || imageUrls.length === 0) return 'At least one product image is required.';

  if (!shippingOptions || shippingOptions.length === 0) return 'At least one delivery option is required.';
  if (!shippingFee) return 'Shipping fee option is required.';
  if (shippingFee !== 'free' && shippingFee !== 'buyer_pays') return 'Shipping fee must be "free" or "buyer_pays".';

  if (shippingFee === 'buyer_pays') {
    for (const opt of shippingOptions) {
      const amount = shippingFeeAmounts?.[opt];
      if (amount == null || isNaN(Number(amount))) {
        return `Shipping fee amount is required for delivery option "${opt}".`;
      }
    }
  }

  if (!hasVariants) {
    if (price == null || isNaN(price) || price < 0) return 'Price is required and must be a non-negative number.';
    if (stock == null || isNaN(stock) || stock < 0) return 'Stock quantity is required and must be a non-negative number.';
  }

  return null;
}

function parseJsonField(raw: unknown): any | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return undefined; }
  }
  return raw;
}

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, category, stock, tags, brand, condition, sku, discount, shippingOptions, shippingFee, shippingFeeAmounts, variantAttributes, variants } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];
    const imageUrls = files.map(f => (f as Express.Multer.File & { path: string }).path || f.filename);

    const parsedShippingOptions: string[] = parseJsonField(shippingOptions) ?? [];
    const parsedShippingFeeAmounts: Record<string, number> = parseJsonField(shippingFeeAmounts) ?? {};
    const parsedVariants = parseJsonField(variants);
    const hasVariants = Array.isArray(parsedVariants) && parsedVariants.length > 0;
    const effectiveImageUrls = imageUrls.length > 0 ? imageUrls : (req.body.image ? [req.body.image] : []);

    const validationError = validateProductFields({
      name, category, description, imageUrls: effectiveImageUrls,
      shippingOptions: parsedShippingOptions,
      shippingFee, shippingFeeAmounts: parsedShippingFeeAmounts,
      price: price != null ? Number(price) : undefined,
      stock: stock != null ? Number(stock) : undefined,
      hasVariants,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const product = await sellerService.createSellerProduct(
      req.user!.id,
      {
        name, description, price: Number(price), category, stock: Number(stock ?? 0),
        tags: parseTags(tags), brand, condition, sku,
        discount: discount != null ? Number(discount) : undefined,
        shippingOptions: parsedShippingOptions,
        shippingFee, shippingFeeAmounts: parsedShippingFeeAmounts,
        variantAttributes: parseJsonField(variantAttributes),
        variants: parsedVariants,
      },
      imageUrls,
    );
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// @desc    Update product (ownership enforced)
// @route   PUT /api/products/:id
// @access  Private (seller)
export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, category, stock, tags, brand, condition, sku, discount, shippingOptions, shippingFee, shippingFeeAmounts, variantAttributes, variants } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];
    const newImageUrls = files.length > 0 ? files.map(f => (f as Express.Multer.File & { path: string }).path || f.filename) : undefined;

    // Load existing product to merge values for validation
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const parsedShippingOptions: string[] = parseJsonField(shippingOptions) ?? (existing.shippingOptions ?? []);
    const parsedShippingFeeAmounts: Record<string, number> = parseJsonField(shippingFeeAmounts) ?? (existing.shippingFeeAmounts ? Object.fromEntries(existing.shippingFeeAmounts as any) : {});
    const parsedVariants = parseJsonField(variants);
    const hasVariants = parsedVariants != null
      ? (Array.isArray(parsedVariants) && parsedVariants.length > 0)
      : (Array.isArray(existing.variants) && existing.variants.length > 0);
    const bodyImage: string | undefined = req.body.image;
    const effectiveImageUrls = newImageUrls ?? (bodyImage ? [bodyImage] : (existing.images?.length ? existing.images : (existing.image ? [existing.image] : [])));

    const validationError = validateProductFields({
      name: name ?? existing.name,
      category: category ?? existing.category,
      description: description ?? existing.description,
      imageUrls: effectiveImageUrls,
      shippingOptions: parsedShippingOptions,
      shippingFee: shippingFee ?? existing.shippingFee,
      shippingFeeAmounts: parsedShippingFeeAmounts,
      price: price != null ? Number(price) : existing.price,
      stock: stock != null ? Number(stock) : existing.stock,
      hasVariants,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const imageUrls = newImageUrls;
    const product = await sellerService.updateSellerProduct(
      req.params.id,
      req.user!.id,
      {
        name, description,
        price: price != null ? Number(price) : undefined,
        category,
        stock: stock != null ? Number(stock) : undefined,
        tags: parseTags(tags), brand, condition, sku,
        discount: discount != null ? Number(discount) : undefined,
        shippingOptions: parseJsonField(shippingOptions),
        shippingFee, shippingFeeAmounts: parseJsonField(shippingFeeAmounts),
        variantAttributes: parseJsonField(variantAttributes),
        variants: parseJsonField(variants),
      },
      imageUrls,
    );
    res.status(200).json({ success: true, product });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// @desc    Delete product (ownership enforced)
// @route   DELETE /api/products/:id
// @access  Private (seller)
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    await sellerService.deleteSellerProduct(req.params.id, req.user!.id);
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Server error' });
  }
};

// @desc    Upload product image to Cloudinary
// @route   POST /api/products/:id/image
// @access  Private (seller, ownership enforced)
export const uploadProductImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const file = req.file as Express.Multer.File & { path: string; filename: string };
    const imageUrl: string = file.path;       // Cloudinary secure URL
    const publicId: string = file.filename;   // Cloudinary public_id

    // Verify ownership then update
    const existing = await Product.findById(req.params.id);
    if (existing && String(existing.sellerId) !== req.user!.id) {
      await cloudinary.uploader.destroy(publicId);
      return res.status(403).json({ success: false, message: 'Not authorised to update this product' });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { image: imageUrl },
      { new: true, runValidators: true }
    );

    if (!product) {
      // Clean up the uploaded image since the product doesn't exist
      await cloudinary.uploader.destroy(publicId);
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      url: imageUrl,
      public_id: publicId,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

// @desc    Upload a single image for a product variant to Cloudinary
// @route   POST /api/products/variant-image
// @access  Private (seller)
export const uploadVariantImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    const file = req.file as Express.Multer.File & { path: string };
    res.status(200).json({ success: true, url: file.path });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed',
    });
  }
};

// @desc    Get public seller profile with their products
// @route   GET /api/products/seller/:sellerId
// @access  Public
export const getSellerPublicProfile = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const user = await User.findById(sellerId).select('firstName lastName avatar createdAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }
    const products = await Product.find({ sellerId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      seller: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar ?? null,
        createdAt: user.createdAt,
      },
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

// @desc    Get product categories
// @route   GET /api/products/categories/all
// @access  Public
const PREDEFINED_CATEGORIES = ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports & Outdoors'];

export const getCategories = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      categories: PREDEFINED_CATEGORIES
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
