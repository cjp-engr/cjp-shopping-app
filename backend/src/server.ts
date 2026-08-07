import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import { startAutoCompleteJob } from './jobs/autoCompleteOrders.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import userRoutes from './routes/userRoutes.js';
import couponRoutes from './routes/couponRoutes.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

connectDB();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 0 = unlimited. Defaults: auth 10/15 min, api 100/min.
// Override via env vars to use small values in rate-limit tests.
const authMax = parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10');
const apiMax  = parseInt(process.env.RATE_LIMIT_API_MAX  ?? '100');

// Stricter limit for auth endpoints — prevents brute-force and signup spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// General limit for all other API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? /^http:\/\/localhost:\d+$/
    : process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/seller', apiLimiter, sellerRoutes);
app.use('/api/cart', apiLimiter, cartRoutes);
app.use('/api/reviews', apiLimiter, reviewRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/coupons', apiLimiter, couponRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'TokoMart API', version: '1.0.0' });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health\n`);
  startAutoCompleteJob();
});

export default app;
