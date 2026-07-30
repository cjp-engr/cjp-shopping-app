import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';

function formatUser(user: InstanceType<typeof User>) {
  return {
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
  };
}

export async function signupUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const exists = await User.findOne({ email: data.email });
  if (exists) throw new AppError(400, 'User already exists with this email');

  const user = await User.create(data);
  const token = generateToken({ id: user._id.toString(), email: user.email });
  return { token, user: formatUser(user) };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const token = generateToken({ id: user._id.toString(), email: user.email });
  return { token, user: formatUser(user) };
}

export async function getUserById(id: string) {
  const user = await User.findById(id).select('-password');
  if (!user) throw new AppError(404, 'User not found');
  return formatUser(user);
}

export async function updateUserProfile(
  id: string,
  updates: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    email?: string;
    address?: object;
    becomeSeller?: boolean;
  },
) {
  const user = await User.findById(id);
  if (!user) throw new AppError(404, 'User not found');

  if (updates.firstName) user.firstName = updates.firstName;
  if (updates.lastName) user.lastName = updates.lastName;
  if (updates.phone !== undefined) user.phone = updates.phone;
  if (updates.avatar) user.avatar = updates.avatar;
  if (updates.address) user.address = updates.address as typeof user.address;

  if (updates.email && updates.email !== user.email) {
    const taken = await User.findOne({ email: updates.email });
    if (taken) throw new AppError(400, 'Email already in use by another account');
    user.email = updates.email.toLowerCase().trim();
  }

  // Only allow promotion to seller — demotion is not permitted
  if (updates.becomeSeller && user.role !== 'seller') {
    user.role = 'seller';
  }

  await user.save();
  return formatUser(user);
}

export async function setAvatarUrl(userId: string, avatarUrl: string) {
  const user = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
  if (!user) throw new AppError(404, 'User not found');
  return formatUser(user);
}
