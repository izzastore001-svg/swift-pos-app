
import { useState, useEffect } from 'react';
import { CartItem, Product } from '../types';
import { Storage } from '../data/storage';

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const savedCart = await Storage.getCart();
      setCart(savedCart);
    } catch (error) {
      console.log('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCartToStorage = async (newCart: CartItem[]) => {
    try {
      await Storage.saveCart(newCart);
    } catch (error) {
      console.log('Error saving cart:', error);
    }
  };

  const addToCart = async (product: Product, quantity: number = 1) => {
    const existingItemIndex = cart.findIndex(item => item.product.id === product.id);
    let newCart: CartItem[];

    if (existingItemIndex >= 0) {
      // Update existing item
      newCart = cart.map((item, index) => {
        if (index === existingItemIndex) {
          const newQuantity = item.quantity + quantity;
          return {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * product.price,
          };
        }
        return item;
      });
    } else {
      // Add new item
      const newItem: CartItem = {
        product,
        quantity,
        subtotal: quantity * product.price,
      };
      newCart = [...cart, newItem];
    }

    setCart(newCart);
    await saveCartToStorage(newCart);
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const newCart = cart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity,
          subtotal: quantity * item.product.price,
        };
      }
      return item;
    });

    setCart(newCart);
    await saveCartToStorage(newCart);
  };

  const removeFromCart = async (productId: string) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    setCart(newCart);
    await saveCartToStorage(newCart);
  };

  const clearCart = async () => {
    setCart([]);
    await Storage.clearCart();
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartItemCount,
  };
};
