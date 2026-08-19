import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Cart, CartItem, SelectedVariant } from '../types/cart';
import type { Product } from '../types/product';
import { STORAGE_KEYS, TAX_RATE } from '../utils/constants';
import storageService from '../services/storageService';
import { API_ENDPOINTS, getHeaders } from '../config/api';

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity?: number, selectedVariant?: SelectedVariant) => void;
  removeFromCart: (productId: string, variantKey?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantKey?: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string, variantKey?: string) => number;
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

const cartItemKey = (item: CartItem): string =>
  item.selectedVariant ? `${item.product.id}|${item.selectedVariant.key}` : item.product.id;

const variantEffectivePrice = (v: SelectedVariant): number =>
  v.discount ? v.price * (1 - v.discount / 100) : v.price;

const calculateCartTotals = (items: CartItem[]): Cart => {
  const subtotal = items.reduce((sum, item) => {
    const price = item.selectedVariant ? variantEffectivePrice(item.selectedVariant) : item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const tax = subtotal * TAX_RATE;

  return { items, totalItems, subtotal, tax, shipping: 0, total: subtotal + tax };
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
      items: items.map(i => ({
        productId: i.product.id,
        variantId: i.selectedVariant?._id,
        selectedAttributes: i.selectedVariant?.attributes,
        price: i.selectedVariant?.price ?? i.product.price,
        stock: i.selectedVariant?.stock ?? i.product.stock,
        image: i.selectedVariant?.image ?? i.product.image,
        sku: i.selectedVariant?.sku ?? i.product.sku,
        discount: i.selectedVariant?.discount,
        quantity: i.quantity,
      })),
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

        // Reconstruct selectedVariant from stored cart data
        let selectedVariant: import('../types/cart').SelectedVariant | undefined;
        if (entry.variantId && entry.selectedAttributes) {
          const attrs: Record<string, string> =
            entry.selectedAttributes && typeof entry.selectedAttributes === 'object'
              ? { ...entry.selectedAttributes }
              : {};
          const key = Object.entries(attrs)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('|');
          // Fall back to current product variant data if discount wasn't stored in cart
          const productVariant = Array.isArray(p.variants)
            ? p.variants.find((v: any) => v._id?.toString() === entry.variantId?.toString())
            : undefined;
          selectedVariant = {
            _id: entry.variantId,
            attributes: attrs,
            price: entry.price ?? p.price ?? 0,
            stock: entry.stock ?? p.stock ?? 0,
            sku: entry.sku,
            discount: entry.discount ?? productVariant?.discount,
            image: entry.image
              ?? productVariant?.images?.[0]
              ?? (productVariant as { image?: string } | undefined)?.image,
            key,
          };
        }

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
          selectedVariant,
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

  const addToCart = (product: Product, quantity: number = 1, selectedVariant?: SelectedVariant) => {
    setCart(prevCart => {
      const key = selectedVariant ? `${product.id}|${selectedVariant.key}` : product.id;
      const effectiveStock = selectedVariant?.stock ?? product.stock;
      const existingIndex = prevCart.items.findIndex(i => cartItemKey(i) === key);
      let newItems: CartItem[];
      if (existingIndex >= 0) {
        newItems = prevCart.items.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: Math.min(item.quantity + quantity, effectiveStock) }
            : item
        );
      } else {
        newItems = [
          ...prevCart.items,
          { product, quantity: Math.min(quantity, effectiveStock), selectedVariant },
        ];
      }
      return calculateCartTotals(newItems);
    });
  };

  const removeFromCart = (productId: string, variantKey?: string) => {
    const key = variantKey ? `${productId}|${variantKey}` : productId;
    setCart(prev => calculateCartTotals(prev.items.filter(i => cartItemKey(i) !== key)));
  };

  const updateQuantity = (productId: string, quantity: number, variantKey?: string) => {
    if (quantity <= 0) { removeFromCart(productId, variantKey); return; }
    const key = variantKey ? `${productId}|${variantKey}` : productId;
    setCart(prev =>
      calculateCartTotals(
        prev.items.map(i => {
          if (cartItemKey(i) !== key) return i;
          const effectiveStock = i.selectedVariant?.stock ?? i.product.stock;
          return { ...i, quantity: Math.min(quantity, effectiveStock) };
        })
      )
    );
  };

  const clearCart = () => setCart(calculateCartTotals([]));

  const getItemQuantity = (productId: string, variantKey?: string) => {
    const key = variantKey ? `${productId}|${variantKey}` : productId;
    return cart.items.find(i => cartItemKey(i) === key)?.quantity ?? 0;
  };

  const validateCart = useCallback(async (): Promise<number> => {
    const items = storageService.get<CartItem[]>(STORAGE_KEYS.CART_DATA) ?? [];
    if (items.length === 0) return 0;

    const results = await Promise.allSettled(
      items.map(item =>
        fetch(API_ENDPOINTS.PRODUCT(item.product.id), { headers: getHeaders() })
          .then(async r => {
            if (!r.ok) return { id: item.product.id, remove: true };
            const data = await r.json();
            const p = data.product ?? data;
            const variantKey = item.selectedVariant?.key;
            const stock = variantKey
              ? (p.variants?.find((v: { key?: string; _id?: string; stock?: number }) =>
                  v.key === variantKey || v._id === variantKey)?.stock ?? 0)
              : (p.stock ?? 0);
            return { id: item.product.id, variantKey, remove: stock <= 0 };
          })
          .catch(() => ({ id: item.product.id, variantKey: undefined, remove: true }))
      )
    );

    const staleItems = results
      .filter(r => r.status === 'fulfilled' && r.value.remove)
      .map(r => (r as PromiseFulfilledResult<{ id: string; variantKey?: string; remove: boolean }>).value);

    if (staleItems.length === 0) return 0;

    const staleKeys = new Set(
      staleItems.map(s => s.variantKey ? `${s.id}|${s.variantKey}` : s.id)
    );
    setCart(prev => calculateCartTotals(
      prev.items.filter(i => !staleKeys.has(i.selectedVariant ? `${i.product.id}|${i.selectedVariant.key}` : i.product.id))
    ));
    return staleItems.length;
  }, []);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, getItemQuantity, validateCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
