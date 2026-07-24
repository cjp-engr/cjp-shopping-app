import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';

const toPublicUser = async (
  user: any,
  currentUserId: string
): Promise<object> => {
  const [followersCount, currentUser] = await Promise.all([
    User.countDocuments({ following: user._id }),
    User.findById(currentUserId).select('following'),
  ]);
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar ?? null,
    role: user.role,
    followersCount,
    followingCount: (user.following ?? []).length,
    isFollowing:
      currentUser?.following?.some((f) => f.equals(user._id)) ?? false,
  };
};

// GET /api/users?q=
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string) ?? '';
    const currentUserId = req.user!.id;

    const filter: any = { _id: { $ne: currentUserId } };
    if (q.trim()) {
      const regex = { $regex: q.trim(), $options: 'i' };
      filter.$or = [{ firstName: regex }, { lastName: regex }];
    }

    const users = await User.find(filter)
      .select('firstName lastName avatar role following')
      .limit(30);

    const result = await Promise.all(
      users.map((u) => toPublicUser(u, currentUserId))
    );

    res.json({ success: true, users: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:id
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findById(id).select(
      'firstName lastName avatar role following'
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const publicUser = await toPublicUser(user, req.user!.id);
    res.json({ success: true, user: publicUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/users/:id/follow
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    if (id === currentUserId) {
      return res
        .status(400)
        .json({ success: false, message: 'Cannot follow yourself' });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const target = await User.findById(id).select('_id');
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: id },
    });

    const followersCount = await User.countDocuments({ following: id });
    res.json({ success: true, isFollowing: true, followersCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/users/:id/follow
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.id;

    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: id },
    });

    const followersCount = await User.countDocuments({ following: id });
    res.json({ success: true, isFollowing: false, followersCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:id/followers
export const getFollowers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const followers = await User.find({ following: id }).select(
      'firstName lastName avatar role following'
    );

    const result = await Promise.all(
      followers.map((u) => toPublicUser(u, req.user!.id))
    );

    res.json({ success: true, users: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/users/:id/following
export const getFollowing = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findById(id)
      .populate<{ following: any[] }>('following', 'firstName lastName avatar role following');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const result = await Promise.all(
      user.following.map((u) => toPublicUser(u, req.user!.id))
    );

    res.json({ success: true, users: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
