import mongoose from 'mongoose';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

interface PublicUser {
  id: unknown;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

/**
 * Batch-resolves public user shapes for a list of users.
 * Replaces the old per-user N+1 pattern with two aggregations.
 */
export async function toPublicUserList(
  users: Array<InstanceType<typeof User>>,
  currentUserId: string,
): Promise<PublicUser[]> {
  if (users.length === 0) return [];

  const userIds = users.map(u => u._id);

  // One aggregation to count followers for every user in the list
  const followerCounts = await User.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { following: { $in: userIds } } },
    { $unwind: '$following' },
    { $match: { following: { $in: userIds } } },
    { $group: { _id: '$following', count: { $sum: 1 } } },
  ]);

  const followerMap = new Map(followerCounts.map(f => [f._id.toString(), f.count]));

  // One query to get current user's following list
  const currentUser = await User.findById(currentUserId).select('following').lean();
  const followingSet = new Set(
    (currentUser?.following ?? []).map((id: mongoose.Types.ObjectId) => id.toString()),
  );

  return users.map(u => ({
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    avatar: u.avatar ?? null,
    role: u.role,
    followersCount: followerMap.get(u._id.toString()) ?? 0,
    followingCount: (u.following ?? []).length,
    isFollowing: followingSet.has(u._id.toString()),
  }));
}

export async function searchUsers(query: string, currentUserId: string): Promise<PublicUser[]> {
  const filter: mongoose.FilterQuery<InstanceType<typeof User>> = { _id: { $ne: currentUserId } };
  if (query.trim()) {
    const regex = { $regex: query.trim(), $options: 'i' };
    filter.$or = [{ firstName: regex }, { lastName: regex }];
  }

  const users = await User.find(filter)
    .select('firstName lastName avatar role following')
    .limit(30)
    .lean();

  return toPublicUserList(users as unknown as Array<InstanceType<typeof User>>, currentUserId);
}

export async function getUserProfile(userId: string, currentUserId: string): Promise<PublicUser> {
  if (!mongoose.isValidObjectId(userId)) throw new AppError(400, 'Invalid user id');

  const user = await User.findById(userId).select('firstName lastName avatar role following');
  if (!user) throw new AppError(404, 'User not found');

  const [result] = await toPublicUserList([user], currentUserId);
  return result;
}

export async function followUser(targetId: string, currentUserId: string) {
  if (targetId === currentUserId) throw new AppError(400, 'Cannot follow yourself');
  if (!mongoose.isValidObjectId(targetId)) throw new AppError(400, 'Invalid user id');

  const target = await User.exists({ _id: targetId });
  if (!target) throw new AppError(404, 'User not found');

  await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetId } });
  const followersCount = await User.countDocuments({ following: targetId });
  return { isFollowing: true, followersCount };
}

export async function unfollowUser(targetId: string, currentUserId: string) {
  await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetId } });
  const followersCount = await User.countDocuments({ following: targetId });
  return { isFollowing: false, followersCount };
}

export async function getFollowers(userId: string, currentUserId: string): Promise<PublicUser[]> {
  if (!mongoose.isValidObjectId(userId)) throw new AppError(400, 'Invalid user id');

  const followers = await User.find({ following: userId }).select(
    'firstName lastName avatar role following',
  );
  return toPublicUserList(followers, currentUserId);
}

export async function getFollowing(userId: string, currentUserId: string): Promise<PublicUser[]> {
  if (!mongoose.isValidObjectId(userId)) throw new AppError(400, 'Invalid user id');

  const user = await User.findById(userId).populate<{ following: Array<InstanceType<typeof User>> }>(
    'following',
    'firstName lastName avatar role following',
  );
  if (!user) throw new AppError(404, 'User not found');

  return toPublicUserList(user.following, currentUserId);
}
