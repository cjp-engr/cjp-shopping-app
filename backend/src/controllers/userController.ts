import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import * as userService from '../services/userService.js';

export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) ?? '';
    const users = await userService.searchUsers(q, req.user!.id);
    res.json({ success: true, users });
  } catch (err) { next(err); }
};

export const getUserProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserProfile(req.params.id, req.user!.id);
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

export const followUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.followUser(req.params.id, req.user!.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const unfollowUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userService.unfollowUser(req.params.id, req.user!.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const getFollowers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getFollowers(req.params.id, req.user!.id);
    res.json({ success: true, users });
  } catch (err) { next(err); }
};

export const getFollowing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getFollowing(req.params.id, req.user!.id);
    res.json({ success: true, users });
  } catch (err) { next(err); }
};
