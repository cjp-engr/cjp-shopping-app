import { useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ShoppingBag, X } from 'lucide-react';
import Navbar from './Navbar';
import { useSellerOrderNotifier } from '../../hooks/useSellerOrderNotifier';

interface OrderToast {
  id: number;
  count: number;
}

const Layout = () => {
  const [toasts, setToasts] = useState<OrderToast[]>([]);

  const handleNewOrders = useCallback((count: number) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, count }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  useSellerOrderNotifier(handleNewOrders);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <Outlet />
      </main>
      <footer className="bg-gray-900 text-white mt-16">
        <div className="container mx-auto px-4 max-w-7xl py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-white mb-1">TokoMart</p>
              <p className="text-sm text-gray-400">Quality products at unbeatable prices.</p>
            </div>
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} TokoMart. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Seller order notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {toasts.map((toast) => (
          <SellerOrderToast
            key={toast.id}
            count={toast.count}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

function SellerOrderToast({
  count,
  onDismiss,
}: {
  count: number;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 shadow-lg rounded-2xl px-4 py-3 w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
        <ShoppingBag className="w-4 h-4 text-green-600 dark:text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          New order{count > 1 ? 's' : ''} received!
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          You have {count} new order{count > 1 ? 's' : ''}. Check your dashboard.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default Layout;
