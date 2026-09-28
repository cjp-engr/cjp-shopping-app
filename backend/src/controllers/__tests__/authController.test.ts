import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock User model
vi.mock('../../models/User.js', () => ({
  default: { findById: vi.fn() },
}));

import User from '../../models/User.js';

describe('setDefaultPaymentMethod', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets isDefault=true on the target card and false on all others', async () => {
    const cards = [
      { _id: 'card1', isDefault: true },
      { _id: 'card2', isDefault: false },
    ];
    const mockUser = {
      savedCards: cards,
      save: vi.fn().mockResolvedValue(undefined),
    };
    (User.findById as any).mockResolvedValue(mockUser);

    const { setDefaultPaymentMethod } = await import('../authController.js');
    const req = { user: { id: 'u1' }, params: { id: 'card2' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    await setDefaultPaymentMethod(req, res, next);

    expect(mockUser.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    const updatedCards: any[] = res.json.mock.calls[0][0].paymentMethods;
    expect(updatedCards.find((c: any) => c._id === 'card2').isDefault).toBe(true);
    expect(updatedCards.find((c: any) => c._id === 'card1').isDefault).toBe(false);
  });

  it('returns 404 when card id not found', async () => {
    const mockUser = { savedCards: [{ _id: 'card1', isDefault: true }], save: vi.fn() };
    (User.findById as any).mockResolvedValue(mockUser);

    const { setDefaultPaymentMethod } = await import('../authController.js');
    const req = { user: { id: 'u1' }, params: { id: 'nonexistent' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    await setDefaultPaymentMethod(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
