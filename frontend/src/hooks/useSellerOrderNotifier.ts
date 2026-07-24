import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

const POLL_INTERVAL_MS = 30_000;

export function useSellerOrderNotifier(onNewOrders: (count: number) => void) {
  const { user, isAuthenticated } = useAuth();
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const onNewOrdersRef = useRef(onNewOrders);
  useEffect(() => { onNewOrdersRef.current = onNewOrders; });

  const poll = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.SELLER_ORDERS, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.orders)) return;

      const currentIds = new Set<string>(
        (data.orders as { _id: string }[]).map((o) => o._id)
      );

      if (!initialized.current) {
        knownIds.current = currentIds;
        initialized.current = true;
        return;
      }

      let newCount = 0;
      for (const id of currentIds) {
        if (!knownIds.current.has(id)) newCount++;
      }

      knownIds.current = currentIds;

      if (newCount > 0) onNewOrdersRef.current(newCount);
    } catch {
      // ignore network errors silently
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'seller') return;

    initialized.current = false;
    knownIds.current = new Set();

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, user?.role, poll]);
}
