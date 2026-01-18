import { useState, useCallback } from 'react';
import { CartItem, Product, ProductSize, getProductPrice } from '../types';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [editingItemNotes, setEditingItemNotes] = useState<string | null>(null);

  const addToCart = useCallback((product: Product, size: ProductSize | null) => {
    const unitPrice = getProductPrice(product, size);
    
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === product.id && item.size === size
      );
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, notes: '', size, unitPrice }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, size: ProductSize | null | undefined, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId && item.size === size) {
            const newQuantity = item.quantity + delta;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, size: ProductSize | null | undefined) => {
    setCart(prev => prev.filter(item => 
      !(item.product.id === productId && item.size === size)
    ));
  }, []);

  const updateItemNotes = useCallback((productId: string, size: ProductSize | null | undefined, notes: string) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId && item.size === size
        ? { ...item, notes }
        : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setOrderNotes('');
    setEditingItemNotes(null);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cart,
    orderNotes,
    editingItemNotes,
    cartTotal,
    itemCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    updateItemNotes,
    setOrderNotes,
    setEditingItemNotes,
    clearCart,
  };
}
