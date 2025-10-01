
import { useState, useEffect } from 'react';
import { CartItem, Product, Discount } from '../types';
import { Storage } from '../data/storage';
import { Alert } from 'react-native';

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);

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

  const saveCart = async (newCart: CartItem[]) => {
    try {
      await Storage.saveCart(newCart);
      setCart(newCart);
    } catch (error) {
      console.log('Error saving cart:', error);
    }
  };

  const addToCart = async (product: Product, quantity: number = 1): Promise<boolean> => {
    try {
      if (product.stock < quantity) {
        Alert.alert('Stok Tidak Cukup', `Stok tersedia: ${product.stock} ${product.unit}`);
        return false;
      }

      const existingItemIndex = cart.findIndex(item => item.product.id === product.id);
      let newCart: CartItem[];

      if (existingItemIndex >= 0) {
        // Update existing item
        const existingItem = cart[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;
        
        if (product.stock < newQuantity) {
          Alert.alert('Stok Tidak Cukup', `Stok tersedia: ${product.stock} ${product.unit}`);
          return false;
        }

        newCart = [...cart];
        newCart[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          subtotal: calculateItemSubtotal(product, newQuantity, existingItem.discount),
        };
      } else {
        // Add new item
        const newItem: CartItem = {
          product,
          quantity,
          discount: 0,
          subtotal: calculateItemSubtotal(product, quantity, 0),
        };
        newCart = [...cart, newItem];
      }

      await saveCart(newCart);
      return true;
    } catch (error) {
      console.log('Error adding to cart:', error);
      return false;
    }
  };

  const removeFromCart = async (productId: string): Promise<void> => {
    try {
      const newCart = cart.filter(item => item.product.id !== productId);
      await saveCart(newCart);
    } catch (error) {
      console.log('Error removing from cart:', error);
    }
  };

  const updateQuantity = async (productId: string, quantity: number): Promise<boolean> => {
    try {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return true;
      }

      const itemIndex = cart.findIndex(item => item.product.id === productId);
      if (itemIndex === -1) return false;

      const item = cart[itemIndex];
      if (item.product.stock < quantity) {
        Alert.alert('Stok Tidak Cukup', `Stok tersedia: ${item.product.stock} ${item.product.unit}`);
        return false;
      }

      const newCart = [...cart];
      newCart[itemIndex] = {
        ...item,
        quantity,
        subtotal: calculateItemSubtotal(item.product, quantity, item.discount),
      };

      await saveCart(newCart);
      return true;
    } catch (error) {
      console.log('Error updating quantity:', error);
      return false;
    }
  };

  const applyItemDiscount = async (productId: string, discount: number): Promise<void> => {
    try {
      const itemIndex = cart.findIndex(item => item.product.id === productId);
      if (itemIndex === -1) return;

      const item = cart[itemIndex];
      const newCart = [...cart];
      newCart[itemIndex] = {
        ...item,
        discount,
        subtotal: calculateItemSubtotal(item.product, item.quantity, discount),
      };

      await saveCart(newCart);
    } catch (error) {
      console.log('Error applying item discount:', error);
    }
  };

  const applyCartDiscount = (discount: Discount | null): void => {
    setAppliedDiscount(discount);
  };

  const calculateItemSubtotal = (product: Product, quantity: number, discount: number = 0): number => {
    const baseSubtotal = product.price * quantity;
    return baseSubtotal - discount;
  };

  const getCartSubtotal = (): number => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const getCartDiscount = (): number => {
    if (!appliedDiscount) return 0;

    const subtotal = getCartSubtotal();
    
    if (appliedDiscount.minPurchase && subtotal < appliedDiscount.minPurchase) {
      return 0;
    }

    switch (appliedDiscount.type) {
      case 'percentage':
        return (subtotal * appliedDiscount.value) / 100;
      case 'fixed':
        return Math.min(appliedDiscount.value, subtotal);
      case 'tiered':
        // Implement tiered discount logic
        return calculateTieredDiscount(subtotal, appliedDiscount.value);
      default:
        return 0;
    }
  };

  const calculateTieredDiscount = (subtotal: number, discountValue: number): number => {
    // Example tiered discount: 5% for 100k+, 10% for 500k+, 15% for 1M+
    if (subtotal >= 1000000) return subtotal * 0.15;
    if (subtotal >= 500000) return subtotal * 0.10;
    if (subtotal >= 100000) return subtotal * 0.05;
    return 0;
  };

  const getCartTotal = (): number => {
    const subtotal = getCartSubtotal();
    const discount = getCartDiscount();
    const tax = (subtotal - discount) * 0.1; // 10% tax
    return subtotal - discount + tax;
  };

  const getTax = (): number => {
    const subtotal = getCartSubtotal();
    const discount = getCartDiscount();
    return (subtotal - discount) * 0.1; // 10% tax
  };

  const clearCart = async (): Promise<void> => {
    try {
      await Storage.clearCart();
      setCart([]);
      setAppliedDiscount(null);
    } catch (error) {
      console.log('Error clearing cart:', error);
    }
  };

  const getCartItemCount = (): number => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const validateCart = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (cart.length === 0) {
      errors.push('Keranjang kosong');
    }

    for (const item of cart) {
      if (item.product.stock < item.quantity) {
        errors.push(`Stok ${item.product.name} tidak cukup (tersedia: ${item.product.stock})`);
      }
      if (item.quantity <= 0) {
        errors.push(`Jumlah ${item.product.name} tidak valid`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const duplicateCart = (): CartItem[] => {
    return cart.map(item => ({
      ...item,
      product: { ...item.product },
    }));
  };

  return {
    cart,
    loading,
    appliedDiscount,
    addToCart,
    removeFromCart,
    updateQuantity,
    applyItemDiscount,
    applyCartDiscount,
    clearCart,
    getCartSubtotal,
    getCartDiscount,
    getCartTotal,
    getTax,
    getCartItemCount,
    validateCart,
    duplicateCart,
    refreshCart: loadCart,
  };
};
