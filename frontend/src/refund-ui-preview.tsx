// Temporary visual verification harness; all API reads are local fixtures.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { RefundRequestPanel } from './components/orders/RefundRequestPanel';
import { CompletedRefunds } from './components/orders/CompletedRefunds';
import { RefundRequestReview } from './components/seller/RefundRequestReview';
import './index.css';
let mode = 'request';
let disabledAfterAttempt = false; let sellerReads = 0;
const refund = { id: 'r', orderId: '368f1cf7', units: [{ lineId: 'a', ordinal: 1, merchandiseMinor: 7999, taxMinor: 640, productName: 'Hiking Backpack · 40L' }], amountMinor: 10038, shippingMinor: 1399, currency: 'usd', state: 'requested', reasonCode: 'wrong_item', description: 'I ordered the 40L backpack, but received the 25L version.', canDecide: true, sellerName: 'SellerX Xavier', buyerName: 'Buyer1 Monte Cristo', orderPlacedAt: '2026-10-18T10:00:00Z', submittedAt: '2026-10-18T14:39:00Z', completedAt: '2026-10-19T01:00:00Z' };
const pageOf = (path: string) => Number(/page=(\d+)/.exec(path)?.[1] ?? 1);
// Three pages of three approved refunds, so scrolling can be checked.
const pagedCompleted = (path: string) => { const page = pageOf(path); return { requests: [0, 1, 2].map(i => ({ ...refund, id: `c${page}-${i}`, orderId: `order${page}${i}abcdef`, state: i === 1 ? 'processing' : 'refunded', sellerName: `Seller ${page}.${i}` })), page, pages: 3, total: 9 }; };
// Two pages of three requests waiting for a decision.
const pagedSeller = (path: string) => { const page = pageOf(path); return { requests: [0, 1, 2].map(i => ({ ...refund, id: `s${page}-${i}`, orderId: `sorder${page}${i}abcdef`, buyerName: `Buyer ${page}.${i}` })), page, pages: 2, total: 6, counts: { in_progress: 6, approved: 5, rejected: 1 } }; };
window.fetch = async (url, options) => {
  if (options?.method && options.method !== 'GET') { disabledAfterAttempt = true; return new Response(JSON.stringify({ message: 'Simulated interrupted response. No payments changed.' }), { status: 502 }); }
  const path = String(url);
  const data = path.includes('/refund-eligibility') ? { eligibility: { orderId: '368f1cf7', eligible: mode === 'request', reason: mode === 'request' ? undefined : 'active_request', requestsEnabled: !disabledAfterAttempt, currency: 'usd', deliveredAt: '2026-10-18T14:38:00Z', deadlineAt: '2026-10-25T14:38:00Z', shippingRefundableMinor: 1399, lines: [{ lineId: 'a', productName: 'Hiking Backpack · 40L', quantityAvailable: 1, quantityOrdered: 1, availableUnitAmountsMinor: [8639] }] } }
    : path.includes('/completed') ? pagedCompleted(path)
    : path.includes('/seller/') ? pagedSeller(path)
    : { requests: mode === 'request' ? [] : [refund] };
  if (path.includes('/seller/') && ++sellerReads === 2) await new Promise(resolve => setTimeout(resolve, 1400));
  return new Response(JSON.stringify({ success: true, ...data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
function Preview() {
  const [view, setView] = useState(mode); const [dark, setDark] = useState(false);
  return <div className={dark ? 'dark' : ''}><main className="min-h-screen bg-gray-50 p-5 dark:bg-gray-900 sm:p-8"><div className="mx-auto max-w-5xl"><p className="mb-5 text-sm text-gray-600 dark:text-gray-300">Actual application components · fixture data only · payments disabled</p><nav className="mb-8 flex flex-wrap gap-3">{['request', 'progress', 'completed', 'seller'].map(v => <button key={v} className="rounded-lg border bg-white px-4 py-3 text-sm" onClick={() => { mode = v; setView(v); }}>{v}</button>)}<button className="rounded-lg border bg-white px-4 py-3 text-sm" onClick={() => setDark(v => !v)}>Light / dark</button></nav><div key={view}>{view === 'completed' ? <CompletedRefunds /> : view === 'seller' ? <RefundRequestReview /> : <RefundRequestPanel orderId="368f1cf7" />}</div></div></main></div>;
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Preview /></BrowserRouter>);
