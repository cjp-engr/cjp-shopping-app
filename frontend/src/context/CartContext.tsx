import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Cart, CartItem } from '../types/cart';
import type { Product } from '../types/product';
import { STORAGE_KEYS, TAX_RATE, SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '../utils/constants';
import storageService from '../services/storageService';
import { API_ENDPOINTS, getHeaders } from '../config/api';

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  validateCart: () => Promise<number>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

const calculateCartTotals = (items: CartItem[]): Cart => {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const tax = subtotal * TAX_RATE;

  const sellerSubtotals = new Map<string, number>();
  for (const item of items) {
    const key = item.product.sellerId ?? '__unknown__';
    sellerSubtotals.set(key, (sellerSubtotals.get(key) ?? 0) + item.product.price * item.quantity);
  }
  let shipping = 0;
  for (const sellerTotal of sellerSubtotals.values()) {
    if (sellerTotal < FREE_SHIPPING_THRESHOLD) shipping += SHIPPING_COST;
  }

  return { items, totalItems, subtotal, tax, shipping, total: subtotal + tax + shipping };
};

const getAuthToken = () => localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

// Push current cart items to backend (best-effort, non-blocking)
const syncToBackend = (items: CartItem[]) => {
  const token = getAuthToken();
  if (!token) return;
  fetch(API_ENDPOINTS.CART, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
    }),
  }).catch(() => {});
};

// Fetch cart from backend and map to CartItem[]
const loadFromBackend = async (): Promise<CartItem[] | null> => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(API_ENDPOINTS.CART, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;

    const items: CartItem[] = [];
    for (const seller of data.sellers ?? []) {
      const sellerIdStr =
        seller.sellerId?._id?.toString() ?? seller.sellerId?.toString() ?? '__unknown__';
      const sellerName = seller.sellerId?.firstName
        ? `${seller.sellerId.firstName} ${seller.sellerId.lastName ?? ''}`.trim()
        : '';

      for (const entry of seller.items ?? []) {
        const p = entry.product;
        if (!p) continue;
        items.push({
          product: {
            id: p._id?.toString() ?? p.id,
            name: p.name ?? '',
            description: p.description ?? '',
            price: p.price ?? 0,
            category: p.category ?? '',
            image: p.images?.[0] ?? p.image ?? '',
            images: p.images ?? [],
            stock: p.stock ?? 0,
            rating: p.rating ?? 0,
            reviews: p.reviewCount ?? p.reviews ?? 0,
            sellerId: sellerIdStr,
            sellerName,
            createdAt: p.createdAt ?? '',
          },
          quantity: entry.quantity,
        });
      }
    }
    return items;
  } catch {
    return null;
  }
};

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<Cart>(() => {
    const saved = storageService.get<CartItem[]>(STORAGE_KEYS.CART_DATA);
    return calculateCartTotals(saved || []);
  });

  // Track whether the current cart state came from a backend load so we don't
  // immediately re-sync it back before the items settle.
  const skipNextSync = useRef(false);

  // Persist to localStorage on every change
  useEffect(() => {
    storageService.set(STORAGE_KEYS.CART_DATA, cart.items);
  }, [cart.items]);

  // Sync to backend on every cart change (debounced 600 ms)
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    const timer = setTimeout(() => syncToBackend(cart.items), 600);
    return () => clearTimeout(timer);
  }, [cart.items]);

  // On mount: if the user is already logged in, load their cart from the backend
  useEffect(() => {
    loadFromBackend().then(items => {
      if (items && items.length > 0) {
        skipNextSync.current = true;
        setCart(calculateCartTotals(items));
        storageService.set(STORAGE_KEYS.CART_DATA, items);
      }
    });
  }, []);

  // Auth event handlers
  useEffect(() => {
    const handleLoad = async () => {
      const items = await loadFromBackend();
      if (items !== null) {
        skipNextSync.current = true;
        setCart(calculateCartTotals(items));
        storageService.set(STORAGE_KEYS.CART_DATA, items);
      }
    };

    const handleClear = () => {
      // Skip the next sync so clearing local state does NOT overwrite
      // the backend cart — the user's items must survive logout.
      skipNextSync.current = true;
      setCart(calculateCartTotals([]));
    };

    window.addEventListener('cart:load', handleLoad);
    window.addEventListener('cart:clear', handleClear);
    return () => {
      window.removeEventListener('cart:load', handleLoad);
      window.removeEventListener('cart:clear', handleClear);
    };
  }, []);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingIndex = prevCart.items.findIndex(i => i.product.id === product.id);
      let newItems: CartItem[];
      if (existingIndex >= 0) {
        newItems = prevCart.items.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item
        );
      } else {
        newItems = [...prevCart.items, { product, quantity: Math.min(quantity, product.stock) }];
      }
      return calculateCartTotals(newItems);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => calculateCartTotals(prev.items.filter(i => i.product.id !== productId)));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCart(prev =>
      calculateCartTotals(
        prev.items.map(i =>
          i.product.id === productId
            ? { ...i, quantity: Math.min(quantity, i.product.stock) }
            : i
        )
      )
    );
  };

  const clearCart = () => setCart(calculateCartTotals([]));

  const getItemQuantity = (productId: string) =>
    cart.items.find(i => i.product.id === productId)?.quantity ?? 0;

  const validateCart = useCallback(async (): Promise<number> => {
    const items = storageService.get<CartItem[]>(STORAGE_KEYS.CART_DATA) ?? [];
    if (items.length === 0) return 0;

    const results = await Promise.allSettled(
      items.map(item =>
        fetch(API_ENDPOINTS.PRODUCT(item.product.id), { headers: getHeaders() })
          .then(r => ({ id: item.product.id, ok: r.ok }))
          .catch(() => ({ id: item.product.id, ok: false }))
      )
    );

    const deletedIds = new Set(
      results
        .filter(r => r.status === 'fulfilled' && !r.value.ok)
        .map(r => (r as PromiseFulfilledResult<{ id: string; ok: boolean }>).value.id)
    );

    if (deletedIds.size === 0) return 0;

    setCart(prev => calculateCartTotals(prev.items.filter(i => !deletedIds.has(i.product.id))));
    return deletedIds.size;
  }, []);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, getItemQuantity, validateCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
