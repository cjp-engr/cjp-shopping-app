import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Cart, CartItem } from '../types/cart';
import type { Product } from '../types/product';
import { STORAGE_KEYS, TAX_RATE, SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '../utils/constants';
import storageService from '../services/storageService';

interface CartContextType {
  cart: Cart;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
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

  // Per-seller shipping: $9.99 per seller whose items total < $50
  const sellerSubtotals = new Map<string, number>();
  for (const item of items) {
    const key = item.product.sellerId ?? '__unknown__';
    sellerSubtotals.set(key, (sellerSubtotals.get(key) ?? 0) + item.product.price * item.quantity);
  }
  let shipping = 0;
  for (const sellerTotal of sellerSubtotals.values()) {
    if (sellerTotal < FREE_SHIPPING_THRESHOLD) shipping += SHIPPING_COST;
  }

  const total = subtotal + tax + shipping;

  return {
    items,
    totalItems,
    subtotal,
    tax,
    shipping,
    total
  };
};

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cart, setCart] = useState<Cart>(() => {
    const savedCart = storageService.get<CartItem[]>(STORAGE_KEYS.CART_DATA);
    return calculateCartTotals(savedCart || []);
  });

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    storageService.set(STORAGE_KEYS.CART_DATA, cart.items);
  }, [cart.items]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.items.findIndex(item => item.product.id === product.id);

      let newItems: CartItem[];

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        newItems = prevCart.items.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = Math.min(item.quantity + quantity, product.stock);
            return { ...item, quantity: newQuantity };
          }
          return item;
        });
      } else {
        // Add new item
        const newItem: CartItem = {
          product,
          quantity: Math.min(quantity, product.stock)
        };
        newItems = [...prevCart.items, newItem];
      }

      return calculateCartTotals(newItems);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const newItems = prevCart.items.filter(item => item.product.id !== productId);
      return calculateCartTotals(newItems);
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => {
      const newItems = prevCart.items.map(item => {
        if (item.product.id === productId) {
          const newQuantity = Math.min(quantity, item.product.stock);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      return calculateCartTotals(newItems);
    });
  };

  const clearCart = () => {
    setCart(calculateCartTotals([]));
  };

  const getItemQuantity = (productId: string): number => {
    const item = cart.items.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
