import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronDown, Clock3, Eye, Package, Store, TriangleAlert, User } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import type { RefundRequest } from '../../types/refund';
import { formatDate } from '../../utils/formatters';
import { refundDateCaption, refundMoney, refundReasonLabels, refundStateLabels } from '../../utils/refund';
import { RefundBreakdown } from './RefundPresentation';

export type RefundViewer = 'buyer' | 'seller';

type State = RefundRequest['state'];
type Tone = 'emerald' | 'amber' | 'red';

const STATUS: Record<State, { variant: 'success' | 'warning' | 'danger'; icon: typeof Clock3; border: string }> = {
  refunded: { variant: 'success', icon: CheckCircle2, border: 'border-l-emerald-500' },
  processing: { variant: 'warning', icon: Clock3, border: 'border-l-amber-400' },
  needs_review: { variant: 'danger', icon: TriangleAlert, border: 'border-l-red-500' },
  requested: { variant: 'warning', icon: Clock3, border: 'border-l-amber-400' },
  rejected: { variant: 'danger', icon: TriangleAlert, border: 'border-l-red-500' },
};

const BANNERS: Record<RefundViewer, Partial<Record<State, { tone: Tone; message: string }>>> = {
  buyer: {
    refunded: { tone: 'emerald', message: 'The refund is confirmed. Your bank may take additional time to post it.' },
    processing: { tone: 'amber', message: 'Approved by the seller. Your refund is processing.' },
    needs_review: { tone: 'red', message: 'The payment needs reconciliation. Do not submit a replacement request.' },
  },
  seller: {
    requested: { tone: 'amber', message: 'Awaiting your decision. The buyer keeps the item if you approve.' },
    refunded: { tone: 'emerald', message: 'Refund completed and confirmed. The buyer’s bank may take additional time to post it.' },
    processing: { tone: 'amber', message: 'You approved this request. The refund is processing.' },
    needs_review: { tone: 'red', message: 'The payment needs reconciliation. New requests for this order are paused.' },
    rejected: { tone: 'red', message: 'You rejected this request.' },
  },
};

const BANNER_TONES: Record<Tone, string> = {
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
  amber: 'border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  red: 'border-red-100 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400',
};

/** What happened to the items, in one word, so the card never says "refunded" before it is. */
const ITEM_WORD: Record<State, string> = {
  refunded: 'refunded', processing: 'approved', needs_review: 'approved', requested: 'requested', rejected: 'rejected',
};

interface RefundItem {
  lineId: string;
  name: string;
  image?: string;
  quantity: number;
  amountMinor: number;
  eachMinor?: number;
}

/** One row per order line, however many of its units are in the request. */
function itemsOf(request: RefundRequest): RefundItem[] {
  const lines = new Map<string, { name: string; image?: string; amounts: number[] }>();
  for (const unit of request.units) {
    const line = lines.get(unit.lineId) ?? { name: unit.productName ?? 'Order item', image: unit.productImage, amounts: [] };
    line.amounts.push(unit.merchandiseMinor + unit.taxMinor);
    lines.set(unit.lineId, line);
  }
  return [...lines.entries()].map(([lineId, line]) => ({
    lineId,
    name: line.name,
    image: line.image,
    quantity: line.amounts.length,
    amountMinor: line.amounts.reduce((sum, amount) => sum + amount, 0),
    eachMinor: line.amounts.every(amount => amount === line.amounts[0]) ? line.amounts[0] : undefined,
  }));
}

function ItemImage({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      {src && !failed
        ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        : <Package className="h-6 w-6" aria-hidden />}
    </div>
  );
}

/**
 * A refund request laid out like the order card in My Orders: who it is with and its status,
 * order number and date, the items with their prices, a total bar, a status banner and actions.
 * `children` is the area for a seller's decision controls, shown between the banner and the buttons.
 */
export function RefundOrderCard({ request, viewer = 'buyer', children }: { request: RefundRequest; viewer?: RefundViewer; children?: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const status = STATUS[request.state];
  const StatusIcon = status.icon;
  const banner = BANNERS[viewer][request.state];
  const items = itemsOf(request);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const seller = viewer === 'seller';
  const orderPath = seller ? `/seller/orders/${request.orderId}` : `/orders/${request.orderId}`;
  const PartyIcon = seller ? User : Store;
  const party = seller ? request.buyerName || 'Buyer' : request.sellerName || 'Store';
  const detailsId = `refund-details-${request.id}`;
  const shipping = request.shippingMinor ?? 0;
  const word = ITEM_WORD[request.state];

  return (
    <Card padding="none" className={`overflow-hidden ${seller ? `border-l-4 ${status.border}` : ''}`} data-testid={`refund-card-${request.id}`}>
      <Link
        to={orderPath}
        className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
      >
        <div className="flex min-w-0 items-center gap-2">
          <PartyIcon className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
          <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{party}</span>
        </div>
        <Badge variant={status.variant} className="flex flex-shrink-0 items-center gap-1">
          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
          {refundStateLabels[request.state]}
        </Badge>
      </Link>

      <Link
        to={orderPath}
        className="flex flex-wrap gap-x-4 gap-y-0.5 border-b border-gray-100 bg-gray-50 px-5 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-700/50"
      >
        <span>Order #{request.orderId.slice(0, 8).toUpperCase()}</span>
        {request.orderPlacedAt && <><span aria-hidden>·</span><span>{formatDate(request.orderPlacedAt)}</span></>}
      </Link>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {items.map(item => (
          <div key={item.lineId} className="flex gap-4 px-5 py-4">
            <ItemImage src={item.image} name={item.name} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">x{item.quantity} · {refundReasonLabels[request.reasonCode]}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">{refundMoney(item.amountMinor, request.currency)}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {item.eachMinor !== undefined && item.quantity > 1 ? `${refundMoney(item.eachMinor, request.currency)} each` : word}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {itemCount} item{itemCount !== 1 ? 's' : ''} {word}
          {shipping > 0 && <span className="text-gray-500 dark:text-gray-400"> · incl. {refundMoney(shipping, request.currency)} shipping</span>}
        </span>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{refundMoney(request.amountMinor, request.currency)}</span>
      </div>

      {banner && (
        <div className={`flex items-start gap-2 border-t px-5 py-2.5 ${BANNER_TONES[banner.tone]}`}>
          <StatusIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <div className="text-xs">
            <p className="font-medium">{banner.message}</p>
            {request.rejectionReason && <p className="mt-0.5">Reason: {request.rejectionReason}</p>}
            <p className="mt-0.5 opacity-90">{refundDateCaption(request)} · original payment method</p>
          </div>
        </div>
      )}

      {children}

      <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-700">
        <Button variant="outline" size="sm" onClick={() => navigate(orderPath)} data-testid="view-refund-order-btn" aria-label={`View order ${request.orderId}`}>
          <Eye className="mr-1.5 h-4 w-4" /> View Details
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls={detailsId}>
          Refund details
          <ChevronDown className={`ml-1.5 h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </Button>
      </div>

      {open && (
        <div id={detailsId} className="space-y-4 border-t border-gray-100 px-5 py-4 dark:border-gray-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{seller ? 'Buyer’s explanation' : 'Your explanation'}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">{request.description}</p>
          </div>
          <RefundBreakdown amount={request.amountMinor} shipping={shipping} tax={request.units.reduce((sum, unit) => sum + unit.taxMinor, 0)} currency={request.currency} />
        </div>
      )}
    </Card>
  );
}
