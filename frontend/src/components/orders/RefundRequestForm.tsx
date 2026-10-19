import { Clock3, Info, Package } from 'lucide-react';
import { Card } from '../common/Card';
import { QuantityStepper } from '../common/QuantityStepper';
import type { RefundEligibility, RefundReason } from '../../types/refund';
import { refundDate, refundMoney, refundReasonLabels } from '../../utils/refund';
import { RefundBreakdown, RefundItemImage, refundButton, refundLabel, refundSelect, refundTextarea } from './RefundPresentation';

interface Props {
  eligibility: RefundEligibility;
  quantities: Record<string, number>;
  reason: RefundReason;
  description: string;
  /** Items plus any shipping, in minor units; null when the selection is not valid. */
  amount: number | null;
  shipping: number;
  busy: boolean;
  /** A submission whose outcome is unknown: the same request is retried, never a new one. */
  uncertain: boolean;
  onQuantity: (lineId: string, quantity: number) => void;
  onReason: (reason: RefundReason) => void;
  onDescription: (description: string) => void;
  onSubmit: () => void;
}

const MAX_DESCRIPTION = 1000;

/**
 * The buyer's request form, laid out like an order card: what to refund (items with a stepper and
 * the amount for the selection), why, a summary of the refund and the submit button.
 */
export function RefundRequestForm({
  eligibility, quantities, reason, description, amount, shipping, busy, uncertain,
  onQuantity, onReason, onDescription, onSubmit,
}: Props) {
  const currency = eligibility.currency ?? 'usd';
  const lines = eligibility.lines.filter(line => line.quantityAvailable > 0);
  const locked = busy || uncertain;
  const shippingOffered = (eligibility.shippingRefundableMinor ?? 0) > 0;
  const selectedItems = lines.reduce((sum, line) => sum + (quantities[line.lineId] ?? 0), 0);
  // A disabled button should say why, not just fade: what is still missing, in the order to do it.
  const missing = busy || uncertain ? '' : !amount ? 'Select an item to refund.' : !description.trim() ? 'Describe the issue to continue.' : '';

  return (
    <form onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <Card padding="none" className="overflow-hidden">
        <fieldset disabled={locked} className="min-w-0">
          <legend className="sr-only">Select items and describe the issue</legend>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Select an item</h3>
            </div>
            {eligibility.deadlineAt && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800 dark:bg-primary-950 dark:text-primary-200">
                <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />Request by {refundDate(eligibility.deadlineAt)}
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {lines.map(line => {
              const quantity = quantities[line.lineId] ?? 0;
              const lineAmount = line.availableUnitAmountsMinor.slice(0, quantity).reduce((sum, unit) => sum + unit, 0);
              return (
                <div key={line.lineId} className="flex flex-wrap gap-4 px-5 py-4">
                  <RefundItemImage src={line.productImage} name={line.productName} />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-100">{line.productName}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{line.quantityAvailable} available</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <QuantityStepper
                      value={quantity} min={0} max={line.quantityAvailable} disabled={locked}
                      onChange={next => onQuantity(line.lineId, next)}
                      decreaseLabel={`Decrease refund quantity for ${line.productName}`}
                      increaseLabel={`Increase refund quantity for ${line.productName}`}
                      valueLabel={`Refund quantity for ${line.productName}`}
                    />
                    <p className={`text-xs ${quantity > 0 ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {quantity > 0 ? `${refundMoney(lineAmount, currency)} refund` : 'Not selected'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-5 border-t border-gray-100 px-5 py-5 dark:border-gray-700">
            <div>
              <label htmlFor="refund-reason" className={`${refundLabel} mb-1`}>Reason</label>
              <select id="refund-reason" value={reason} onChange={event => onReason(event.target.value as RefundReason)} className={refundSelect}>
                {Object.entries(refundReasonLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>
            {shippingOffered && (
              <p className={`text-xs leading-relaxed ${shipping > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {shipping > 0
                  ? `Shipping (${refundMoney(shipping, currency)}) is included in your refund.`
                  : `Shipping (${refundMoney(eligibility.shippingRefundableMinor ?? 0, currency)}) is refunded only when you select every item for a damaged, wrong, missing or not-as-described item.`}
              </p>
            )}
            <div>
              <label htmlFor="refund-description" className={`${refundLabel} mb-2`}>Tell the seller what happened</label>
              <textarea
                id="refund-description" required maxLength={MAX_DESCRIPTION} rows={4} value={description}
                placeholder="Describe the issue with the item you received."
                onChange={event => onDescription(event.target.value)}
                aria-describedby="refund-description-help"
                className={refundTextarea}
              />
              <p id="refund-description-help" className="mt-1 flex justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Describe the problem so the seller can review your request.</span>
                <span className="tabular-nums">{description.length}/{MAX_DESCRIPTION}</span>
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/50">
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
              Your refund{selectedItems > 0 && <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">{selectedItems} item{selectedItems === 1 ? '' : 's'}</span>}
            </h3>
            <RefundBreakdown amount={amount ?? 0} shipping={shipping} currency={currency} />
            <p className="mt-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              Your original discounts and tax are included. Shipping eligibility updates with your selection and reason.
            </p>
          </div>
        </fieldset>

        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          {missing && (
            <p id="refund-submit-hint" className="mb-3 flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <Info className="h-4 w-4 shrink-0" aria-hidden />{missing}
            </p>
          )}
          <button
            type="submit" aria-describedby={missing ? 'refund-submit-hint' : undefined}
            disabled={busy || (!uncertain && (!amount || !description.trim()))} className={`${refundButton} w-full`}>
            {busy ? 'Submitting…' : uncertain ? 'Retry same request' : 'Submit refund request'}
          </button>
          <p className="mt-3 text-center text-xs text-gray-600 dark:text-gray-300">The seller reviews your request first.</p>
        </div>
      </Card>
    </form>
  );
}
