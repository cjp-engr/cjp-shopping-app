import type React from 'react';
import { Clock, Package, Truck, CheckCircle, XCircle } from 'lucide-react';

export type StatusVariant = 'primary' | 'success' | 'warning' | 'danger' | 'gray';

export interface StatusConfig {
  icon: React.ElementType;
  variant: StatusVariant;
  label: string;
}

export const getStatusConfig = (status: string): StatusConfig => {
  switch (status) {
    case 'pending':    return { icon: Clock,       variant: 'warning', label: 'Pending' };
    case 'processing': return { icon: Package,     variant: 'primary', label: 'Processing' };
    case 'shipped':    return { icon: Truck,       variant: 'primary', label: 'Shipped' };
    case 'delivered':  return { icon: CheckCircle, variant: 'success', label: 'Delivered' };
    case 'cancelled':  return { icon: XCircle,     variant: 'danger',  label: 'Cancelled' };
    default:           return { icon: Package,     variant: 'gray',    label: status };
  }
};
