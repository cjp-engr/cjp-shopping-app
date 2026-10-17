import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import Order from '../../models/Order.js';

dotenv.config();

export interface DuplicateIntentGroup {
  paymentIntentId: string;
  orderIds: string[];
}

export async function findDuplicatePaymentIntents(): Promise<DuplicateIntentGroup[]> {
  const groups = await Order.aggregate<{ _id: string; orders: mongoose.Types.ObjectId[] }>([
    { $match: { paymentIntentId: { $exists: true, $ne: null } } },
    { $group: { _id: '$paymentIntentId', orders: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  return groups.map(group => ({
    paymentIntentId: group._id,
    orderIds: group.orders.map(String),
  }));
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopping-app';
  await mongoose.connect(uri);
  try {
    const groups = await findDuplicatePaymentIntents();
    if (groups.length === 0) {
      console.log('No duplicate paymentIntentId values. Safe to create the unique index.');
    } else {
      console.log(`Found ${groups.length} duplicate paymentIntentId group(s). Resolve before enforcing the unique index:`);
      for (const group of groups) console.log(JSON.stringify(group));
    }
    process.exitCode = groups.length === 0 ? 0 : 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Duplicate check failed:', err);
    process.exitCode = 2;
  });
}
