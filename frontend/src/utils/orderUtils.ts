import type React from 'react';
import { Clock, Package, Truck, CheckCircle, XCircle, ClipboardList } from 'lucide-react';

export type StatusVariant = 'primary' | 'success' | 'warning' | 'danger' | 'gray';

export interface StatusConfig {
  icon: React.ElementType;
  variant: StatusVariant;
  label: string;
}

export const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case 'pending':    return { icon: Clock,          variant: 'warning', label: 'Pending' };
    case 'preparing':  return { icon: ClipboardList,  variant: 'warning', label: 'Preparing' };
    case 'processing': return { icon: Package,        variant: 'primary', label: 'Processing' };
    case 'shipped':    return { icon: Truck,       variant: 'primary', label: 'Shipped' };
    case 'delivered':  return { icon: CheckCircle, variant: 'success', label: 'Delivered' };
    case 'cancelled':  return { icon: XCircle,     variant: 'danger',  label: 'Cancelled' };
    default:           return { icon: Package,     variant: 'gray',    label: status };
  }
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'credit-card': 'Credit Card',
  'debit-card': 'Debit Card',
  'paypal': 'PayPal',
  'cash-on-delivery': 'Cash on Delivery',
};

export const formatPaymentMethodType = (type: string): string =>
  PAYMENT_METHOD_LABELS[type]
  ?? type.split('-').map(part =>
    part ? `${part[0].toUpperCase()}${part.slice(1)}` : part,
  ).join(' ');

const DELIVERY_OPTION_LABELS: Record<string, string> = {
  standard: 'Standard',
  express: 'Express',
  pickup: 'Pickup',
};

export const formatDeliveryOption = (option: string): string =>
  DELIVERY_OPTION_LABELS[option]
  ?? option.split('-').map(part =>
    part ? `${part[0].toUpperCase()}${part.slice(1)}` : part,
  ).join(' ');

export function resolveSelectedDeliveryOption(order: {
  selectedDeliveryOption?: string;
  deliverySelections?: unknown;
}): string | undefined {
  const fromMap = parseDeliverySelectionsMap(order.deliverySelections);
  if (fromMap) return fromMap;
  if (order.selectedDeliveryOption) return order.selectedDeliveryOption;
  return undefined;
}

function parseDeliverySelectionsMap(raw: unknown): string | undefined {
  if (!raw) return undefined;
  if (raw instanceof Map) {
    const values = [...raw.values()].filter(v => v != null && String(v).length > 0);
    return values[0] != null ? String(values[0]) : undefined;
  }
  if (typeof raw === 'object') {
    const values = Object.values(raw as Record<string, unknown>)
      .filter(v => v != null && String(v).length > 0);
    return values[0] != null ? String(values[0]) : undefined;
  }
  return undefined;
}
