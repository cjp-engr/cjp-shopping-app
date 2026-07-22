import { Request, Response } from 'express';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });

    // Generate token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address,
        savedCards: user.savedCards,
        savedAddresses: user.savedAddresses,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address,
        savedCards: user.savedCards,
        savedAddresses: user.savedAddresses,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address,
        savedCards: user.savedCards,
        savedAddresses: user.savedAddresses,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Upload avatar to Cloudinary and save URL
// @route   POST /api/auth/avatar
// @access  Private
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }
    const file = req.file as Express.Multer.File & { path: string };
    const avatarUrl: string = file.path;

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { avatar: avatarUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address,
        savedCards: user.savedCards,
        savedAddresses: user.savedAddresses,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (req.body.firstName) user.firstName = req.body.firstName;
    if (req.body.lastName) user.lastName = req.body.lastName;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.avatar) user.avatar = req.body.avatar;

    // Update email with duplicate check
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another account'
        });
      }
      user.email = req.body.email.toLowerCase().trim();
    }

    if (req.body.address) {
      user.address = req.body.address;
    }

    if (req.body.role === 'seller') {
      user.role = 'seller';
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        phone: updatedUser.phone,
        address: updatedUser.address,
        savedCards: updatedUser.savedCards,
        savedAddresses: updatedUser.savedAddresses,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Server error'
    });
  }
};

// @desc    Get saved payment methods
// @route   GET /api/auth/payment-methods
// @access  Private
export const getPaymentMethods = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('savedCards');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, paymentMethods: user.savedCards });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add a saved payment method (stores only last4, never full card number)
// @route   POST /api/auth/payment-methods
// @access  Private
export const addPaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { type, last4, cardHolder, expiryMonth, expiryYear, setAsDefault } = req.body;
    if (!type || !last4 || !cardHolder || !expiryMonth || !expiryYear) {
      return res.status(400).json({ success: false, message: 'Missing required card fields' });
    }

    const duplicate = user.savedCards.find(
      c => c.last4 === last4 && c.expiryMonth === expiryMonth && c.expiryYear === expiryYear
    );
    if (duplicate) return res.json({ success: true, paymentMethods: user.savedCards });

    if (setAsDefault) user.savedCards.forEach(c => { c.isDefault = false; });

    user.savedCards.push({ type, last4, cardHolder, expiryMonth, expiryYear,
      isDefault: setAsDefault || user.savedCards.length === 0 });
    await user.save();
    res.status(201).json({ success: true, paymentMethods: user.savedCards });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a saved payment method
// @route   DELETE /api/auth/payment-methods/:id
// @access  Private
export const deletePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const before = user.savedCards.length;
    user.savedCards = user.savedCards.filter(c => c._id?.toString() !== req.params.id);
    if (user.savedCards.length === before) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }
    if (user.savedCards.length > 0 && !user.savedCards.some(c => c.isDefault)) {
      user.savedCards[0].isDefault = true;
    }
    await user.save();
    res.json({ success: true, paymentMethods: user.savedCards });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get saved addresses
// @route   GET /api/auth/saved-addresses
// @access  Private
export const getSavedAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('savedAddresses');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
};

// @desc    Add a saved address
// @route   POST /api/auth/saved-addresses
// @access  Private
export const addSavedAddress = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { label, street, city, state, zipCode, country, setAsDefault } = req.body;
    if (!street || !city) return res.status(400).json({ success: false, message: 'street and city are required' });
    if (setAsDefault) user.savedAddresses.forEach(a => { a.isDefault = false; });
    user.savedAddresses.push({ label: label || 'Home', street, city, state: state || '', zipCode: zipCode || '', country: country || '', isDefault: setAsDefault || user.savedAddresses.length === 0 });
    await user.save();
    res.status(201).json({ success: true, savedAddresses: user.savedAddresses });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
};

// @desc    Delete a saved address
// @route   DELETE /api/auth/saved-addresses/:id
// @access  Private
export const deleteSavedAddress = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const before = user.savedAddresses.length;
    user.savedAddresses = user.savedAddresses.filter(a => a._id?.toString() !== req.params.id);
    if (user.savedAddresses.length === before) return res.status(404).json({ success: false, message: 'Address not found' });
    if (user.savedAddresses.length > 0 && !user.savedAddresses.some(a => a.isDefault)) {
      user.savedAddresses[0].isDefault = true;
    }
    await user.save();
    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
};

// @desc    Set default address
// @route   PUT /api/auth/saved-addresses/:id/default
// @access  Private
export const setDefaultAddress = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.savedAddresses.forEach(a => { a.isDefault = a._id?.toString() === req.params.id; });
    await user.save();
    res.json({ success: true, savedAddresses: user.savedAddresses });
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
};
