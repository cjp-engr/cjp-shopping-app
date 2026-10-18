import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import Order from '../../../models/Order.js';
import { findDuplicatePaymentIntents } from '../checkDuplicatePaymentIntents.js';
import { connectIntegrationDb } from '../../../services/__tests__/integrationDb.js';

describe('findDuplicatePaymentIntents (replica set)', () => {
  beforeAll(async () => {
    await connectIntegrationDb();
    await Order.init();
    // Duplicates can only exist in data written before the unique index was enforced.
    await Order.collection.dropIndex('paymentIntentId_1').catch(() => undefined);
  });

  afterEach(async () => {
    await Order.collection.deleteMany({});
  });

  afterAll(async () => {
    await Order.createIndexes();
    await mongoose.disconnect();
  });

  it('reports intents shared by more than one order and ignores unique ones', async () => {
    const base = { userId: new mongoose.Types.ObjectId(), status: 'pending' };
    const [a, b, c] = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
    await Order.collection.insertMany([
      { _id: a, ...base, paymentIntentId: 'pi_shared' },
      { _id: b, ...base, paymentIntentId: 'pi_shared' },
      { _id: c, ...base, paymentIntentId: 'pi_unique' },
    ]);

    const groups = await findDuplicatePaymentIntents();

    expect(groups).toHaveLength(1);
    expect(groups[0].paymentIntentId).toBe('pi_shared');
    expect(groups[0].orderIds.sort()).toEqual([a.toString(), b.toString()].sort());
  });

  it('returns no groups when every intent is unique', async () => {
    await Order.collection.insertMany([
      { userId: new mongoose.Types.ObjectId(), status: 'pending', paymentIntentId: 'pi_1' },
      { userId: new mongoose.Types.ObjectId(), status: 'pending', paymentIntentId: 'pi_2' },
    ]);
    expect(await findDuplicatePaymentIntents()).toEqual([]);
  });
});
