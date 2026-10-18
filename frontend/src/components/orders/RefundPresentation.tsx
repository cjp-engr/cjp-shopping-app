import { useState, type ReactNode } from 'react';
import { CheckCircle2, Clock3, Package, TriangleAlert } from 'lucide-react';
import type { RefundRequest } from '../../types/refund';
import { refundAmountCaption, refundDateCaption, refundMoney, refundReasonLabels, refundStateLabels } from '../../utils/refund';
export const refundSurface = 'rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:p-6';
export const refundField = 'mt-2 block min-h-12 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';
export const refundButton = 'min-h-12 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const refundSecondary = 'min-h-12 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700';
/** Order link on a refund card: dark navy on white is about 14:1 (the brand orange was 3.8:1), underlined so it never relies on colour alone, with a 44px tap height. */
export const refundOrderLink = 'inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary-800 underline decoration-primary-500 decoration-2 underline-offset-4 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300 dark:hover:text-primary-100';
export function RefundProduct({ name, image, detail, children }: { name: string; image?: string; detail?: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  return <div className="flex min-w-0 items-center gap-3"><div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-700">
    {image && !failed ? <img src={image} alt={name} onError={() => setFailed(true)} className="h-full w-full object-cover" loading="lazy" /> : <Package className="h-7 w-7" aria-hidden />}
  </div><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{name}</p>{detail && <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{detail}</p>}{children}</div></div>;
}
export function RefundBreakdown({ amount, shipping, tax, currency }: { amount: number; shipping: number; tax?: number; currency: string }) {
  return <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">{tax === undefined ? 'Items & original tax' : 'Items after discounts'}</dt><dd>{refundMoney(amount - shipping - (tax ?? 0), currency)}</dd></div>
    {tax !== undefined && <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Original tax</dt><dd>{refundMoney(tax, currency)}</dd></div>}
    <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Shipping refund</dt><dd>{refundMoney(shipping, currency)}</dd></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 font-semibold dark:border-gray-700"><dt>Refund total</dt><dd className="text-2xl tracking-tight">{refundMoney(amount, currency)}</dd></div></dl>;
}
export function RefundHistoryCard({ request: r, children, orderLink, sellerReview = false }: { request: RefundRequest; children?: ReactNode; orderLink?: ReactNode; sellerReview?: boolean }) {
  const complete = r.state === 'refunded';
  const Icon = complete ? CheckCircle2 : ['needs_review', 'rejected'].includes(r.state) ? TriangleAlert : Clock3;
  return <article className={refundSurface}>
    <div className="flex flex-wrap items-center justify-between gap-3"><span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${complete ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200'}`}><Icon className="h-4 w-4" aria-hidden />{refundStateLabels[r.state]}</span>{orderLink}</div>
    <p className="mt-5 text-3xl font-bold tracking-tight">{refundMoney(r.amountMinor, r.currency)}</p><p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{refundAmountCaption(r.state)} · original payment method</p>
    <div className="my-5 space-y-3 border-y border-gray-200 py-5 dark:border-gray-700">{r.units.map(u => <RefundProduct key={`${u.lineId}-${u.ordinal}`} name={u.productName ?? 'Order item'} image={u.productImage} detail={`Unit ${u.ordinal} · ${refundReasonLabels[r.reasonCode]} · ${refundMoney(u.merchandiseMinor + u.taxMinor, r.currency)}`} />)}</div>
    <p className="text-xs text-gray-600 dark:text-gray-300">{refundDateCaption(r)}</p>
    {r.state === 'requested' && !sellerReview && <p className="mt-3 text-sm">Waiting for the seller. You can check the decision here.</p>}
    {r.state === 'processing' && <p className="mt-3 text-sm">Approved. Your refund is processing.</p>}
    {r.state === 'needs_review' && <p className="mt-3 text-sm">Payment needs reconciliation. Do not submit a replacement request.</p>}
    {complete && <p className="mt-3 text-sm">The refund is confirmed. Your bank may take additional time to post it.</p>}
    {r.rejectionReason && <p className="mt-3 text-sm">Seller response: {r.rejectionReason}</p>}
    <details className="mt-2" open={sellerReview}><summary className="flex min-h-12 cursor-pointer items-center text-sm font-semibold text-gray-700 dark:text-gray-200">{sellerReview ? 'Buyer’s explanation & refund' : 'View refund details'}</summary><p className="mb-4 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{r.description}</p><RefundBreakdown amount={r.amountMinor} shipping={r.shippingMinor ?? 0} tax={r.units.reduce((s, u) => s + u.taxMinor, 0)} currency={r.currency} /></details>
    {children}
  </article>;
}
