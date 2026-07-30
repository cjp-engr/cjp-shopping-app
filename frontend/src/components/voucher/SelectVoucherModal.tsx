import React, { useEffect, useState } from 'react';
import { Tag, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import couponService, { type Coupon } from '../../services/couponService';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  orderAmount: number;
  selectedCode: string | null;
  onApply: (code: string, discountAmount: number) => void;
  onRemove: () => void;
}

function discountLabel(c: Coupon) {
  if (c.discountType === 'percentage') {
    const label = `${c.discountValue}% off`;
    return c.maxDiscount ? `${label} Max ${formatCurrency(c.maxDiscount)} off` : label;
  }
  return `${formatCurrency(c.discountValue)} off`;
}

function isRecommended(c: Coupon, orderAmount: number) {
  if (c.discountType === 'fixed') return true;
  if (c.discountType === 'percentage' && !c.maxDiscount) return true;
  if (c.maxDiscount && orderAmount * (c.discountValue / 100) >= c.maxDiscount) return true;
  return false;
}

export const SelectVoucherModal: React.FC<Props> = ({
  isOpen, onClose, sellerId, sellerName, orderAmount,
  selectedCode, onApply, onRemove,
}) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [applyingManual, setApplyingManual] = useState(false);
  const [selected, setSelected] = useState<string | null>(selectedCode);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(selectedCode);
    setManualCode('');
    setManualError(null);
    setLoading(true);
    couponService.getAvailable(sellerId, orderAmount).then(data => {
      setCoupons(data);
      setLoading(false);
    });
  }, [isOpen, sellerId, orderAmount, selectedCode]);

  const handleApplyManual = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    setManualError(null);
    setApplyingManual(true);
    try {
      const result = await couponService.validate(code, sellerId, orderAmount);
      onApply(result.coupon.code, result.discountAmount);
      setSelected(result.coupon.code);
      onClose();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Invalid voucher code');
    } finally {
      setApplyingManual(false);
    }
  };

  const handleSelectCoupon = async (code: string) => {
    if (selected === code) {
      setSelected(null);
      return;
    }
    try {
      const result = await couponService.validate(code, sellerId, orderAmount);
      setSelected(code);
      onApply(result.coupon.code, result.discountAmount);
    } catch {
      // should not happen since we fetched available
    }
  };

  const handleConfirm = () => {
    if (!selected) onRemove();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Select Voucher</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Manual code input */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => { setManualCode(e.target.value.toUpperCase()); setManualError(null); }}
                placeholder="Enter voucher code"
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyDown={e => e.key === 'Enter' && handleApplyManual()}
              />
              <Button
                onClick={handleApplyManual}
                loading={applyingManual}
                disabled={!manualCode.trim()}
                className="px-5"
              >
                Apply
              </Button>
            </div>
            {manualError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {manualError}
              </p>
            )}
          </div>

          {/* Available coupons */}
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              {sellerName} Vouchers
            </p>

            {loading ? (
              <div className="flex justify-center py-8"><Spinner size="md" /></div>
            ) : coupons.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No vouchers available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coupons.map(coupon => {
                  const isSelected = selected === coupon.code;
                  const recommended = isRecommended(coupon, orderAmount);
                  const expiresIn = coupon.expiresAt
                    ? Math.ceil((new Date(coupon.expiresAt).getTime() - Date.now()) / 86_400_000)
                    : null;

                  return (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => handleSelectCoupon(coupon.code)}
                      className={`w-full flex items-stretch rounded-xl border-2 transition-all text-left overflow-hidden ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-gray-800 dark:border-primary-500'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300'
                      }`}
                    >
                      {/* Color strip */}
                      <div className={`w-2 flex-shrink-0 ${isSelected ? 'bg-primary-500' : 'bg-orange-400'}`} />

                      {/* Icon block */}
                      <div className={`flex items-center justify-center px-4 py-3 ${isSelected ? 'bg-primary-100 dark:bg-primary-800' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                        <Tag className={`w-7 h-7 ${isSelected ? 'text-primary-600 dark:text-primary-100' : 'text-orange-500'}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 px-3 py-3 min-w-0">
                        <p className={`text-xs font-extrabold tracking-wide mb-1 ${isSelected ? 'text-primary-600 dark:text-primary-300' : 'text-orange-500'}`}>
                          {coupon.code}
                        </p>
                        {recommended && (
                          <span className="inline-block text-xs font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded mb-1">
                            Recommended
                          </span>
                        )}
                        <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-primary-700 dark:text-primary-100' : 'text-gray-900 dark:text-white'}`}>
                          {discountLabel(coupon)}
                        </p>
                        {coupon.minOrderAmount > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Min. Spend {formatCurrency(coupon.minOrderAmount)}
                          </p>
                        )}
                        {coupon.description && !/^\d+$/.test(coupon.description.trim()) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{coupon.description}</p>
                        )}
                        {expiresIn != null && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {expiresIn <= 1 ? 'Expiring: 1 day left' : `Expires in ${expiresIn} days`}
                          </p>
                        )}
                      </div>

                      {/* Radio */}
                      <div className="flex items-center pr-4">
                        {isSelected ? (
                          <CheckCircle className="w-5 h-5 text-primary-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selected ? '1 Voucher Selected.' : 'No voucher selected'}
            </span>
            {selected && (
              <button
                onClick={() => { setSelected(null); onRemove(); }}
                className="text-sm text-primary-600 font-medium hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <Button fullWidth onClick={handleConfirm}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};
