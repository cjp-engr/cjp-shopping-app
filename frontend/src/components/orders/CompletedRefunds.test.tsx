import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('../../services/refundService', () => ({ refundService: { completed: vi.fn() } }));
import { CompletedRefunds } from './CompletedRefunds';

describe('buyer Return/Refund tab', () => {
  it('has a heading and no refresh button: the list loads when the tab opens', () => {
    const html = renderToStaticMarkup(<CompletedRefunds />);
    expect(html).toContain('Return/Refund');
    expect(html).not.toContain('Refresh refunds');
    expect(html).not.toMatch(/<button/);
  });
});
