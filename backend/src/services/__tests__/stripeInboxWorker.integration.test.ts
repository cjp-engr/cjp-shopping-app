import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import StripeEventInbox from '../../models/StripeEventInbox.js';
import { connectIntegrationDb } from './integrationDb.js';
import { dispatchWebhookEvent } from '../checkoutWebhook.js';
import { processStripeInboxEvent, replayStripeInbox } from '../stripeInboxWorker.js';

vi.mock('../checkoutWebhook.js', () => ({ dispatchWebhookEvent: vi.fn() }));

describe('durable webhook replay', () => {
  beforeAll(async () => { await connectIntegrationDb(); await StripeEventInbox.init(); });
  afterEach(async () => { await StripeEventInbox.deleteMany({}); vi.resetAllMocks(); });
  afterAll(async () => { await mongoose.disconnect(); });

  it('replays a failed persisted event after backoff without needing another Stripe delivery', async () => {
    await StripeEventInbox.create({ eventId: 'evt_retry', type: 'payment_intent.succeeded', eventObject: { id: 'pi_1' } });
    vi.mocked(dispatchWebhookEvent).mockRejectedValueOnce(new Error('database temporarily unavailable')).mockResolvedValue(undefined);
    const now = new Date();
    expect(await processStripeInboxEvent('evt_retry', undefined, now)).toBe('failed');
    const failed = await StripeEventInbox.findOne({ eventId: 'evt_retry' });
    expect(failed!.status).toBe('failed');
    expect(failed!.attempts).toBe(1);
    await replayStripeInbox(new Date(now.getTime() + 60000));
    const completed = await StripeEventInbox.findOne({ eventId: 'evt_retry' });
    expect(completed!.status).toBe('processed');
    expect(completed!.attempts).toBe(2);
    await replayStripeInbox(new Date(now.getTime() + 120000));
    expect(dispatchWebhookEvent).toHaveBeenCalledTimes(2);
  });

  it('only one worker processes a concurrently claimed event', async () => {
    await StripeEventInbox.create({ eventId: 'evt_race', type: 'payment_intent.succeeded', eventObject: { id: 'pi_2' } });
    vi.mocked(dispatchWebhookEvent).mockResolvedValue(undefined);
    await Promise.all([processStripeInboxEvent('evt_race'), processStripeInboxEvent('evt_race')]);
    expect(dispatchWebhookEvent).toHaveBeenCalledTimes(1);
    expect((await StripeEventInbox.findOne({ eventId: 'evt_race' }))!.status).toBe('processed');
  });

  it('recovers processing interrupted by a server restart', async () => {
    await StripeEventInbox.create({ eventId: 'evt_crash', type: 'payment_intent.succeeded', status: 'processing', attempts: 1,
      leaseOwner: 'dead-server', leaseExpiresAt: new Date(0), eventObject: { id: 'pi_3' } });
    vi.mocked(dispatchWebhookEvent).mockResolvedValue(undefined);
    await replayStripeInbox();
    expect((await StripeEventInbox.findOne({ eventId: 'evt_crash' }))!.status).toBe('processed');
  });
});
