import { Request, Response } from 'express';
import Product from '../models/Product.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

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
      search,
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

    if (search) {
      query.$text = { $search: search as string };
    }

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

// @desc    Create product (Admin only - for now public for seeding)
// @route   POST /api/products
// @access  Public
export const createProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
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

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Public (should be Admin only in production)
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

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

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Public (should be Admin only in production)
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Upload product image to Cloudinary
// @route   POST /api/products/:id/image
// @access  Public (should be Admin only in production)
export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const file = req.file as Express.Multer.File & { path: string; filename: string };
    const imageUrl: string = file.path;       // Cloudinary secure URL
    const publicId: string = file.filename;   // Cloudinary public_id

    // Update the product's image field
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
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Product.distinct('category');

    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};
