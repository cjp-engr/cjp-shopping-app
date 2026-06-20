import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tokomart/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  } as object,
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tokomart/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'center', quality: 'auto' }],
  } as object,
});

export const upload = multer({ storage: productStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
export const avatarUpload = multer({ storage: avatarStorage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
