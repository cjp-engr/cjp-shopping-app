import { useState } from 'react';
import { Package } from 'lucide-react';
import { refundMoney } from '../../utils/refund';
export const refundSurface = 'rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:p-6';
export const refundField = 'mt-2 block min-h-12 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';
/** Labels, the select and the text box, copied from the product form's category select and the review box. */
export const refundLabel = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
export const refundSelect = 'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
export const refundTextarea = 'w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500';
export const refundButton = 'min-h-12 rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const refundSecondary = 'min-h-12 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700';
/** 64px product image for refund rows, with a placeholder when there is no image or it fails to load. */
export function RefundItemImage({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      {src && !failed
        ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : <Package className="h-6 w-6" aria-hidden />}
    </div>
  );
}
export function RefundBreakdown({ amount, shipping, tax, currency }: { amount: number; shipping: number; tax?: number; currency: string }) {
  return <dl className="space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">{tax === undefined ? 'Items & original tax' : 'Items after discounts'}</dt><dd>{refundMoney(amount - shipping - (tax ?? 0), currency)}</dd></div>
    {tax !== undefined && <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Original tax</dt><dd>{refundMoney(tax, currency)}</dd></div>}
    <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-300">Shipping refund</dt><dd>{refundMoney(shipping, currency)}</dd></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 font-bold text-gray-900 dark:border-gray-700 dark:text-gray-100"><dt>Refund total</dt><dd>{refundMoney(amount, currency)}</dd></div></dl>;
}
