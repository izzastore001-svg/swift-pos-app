
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Product, Transaction, Customer, Store, CartItem } from '../types';

const STORAGE_KEYS = {
  USERS: '@pos_users',
  PRODUCTS: '@pos_products',
  TRANSACTIONS: '@pos_transactions',
  CUSTOMERS: '@pos_customers',
  STORES: '@pos_stores',
  CURRENT_USER: '@pos_current_user',
  CART: '@pos_cart',
  SETTINGS: '@pos_settings',
};

export class Storage {
  static async getUsers(): Promise<User[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log('Error getting users:', error);
      return [];
    }
  }

  static async saveUsers(users: User[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (error) {
      console.log('Error saving users:', error);
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.log('Error getting current user:', error);
      return null;
    }
  }

  static async setCurrentUser(user: User | null): Promise<void> {
    try {
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (error) {
      console.log('Error setting current user:', error);
    }
  }

  static async getProducts(): Promise<Product[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log('Error getting products:', error);
      return [];
    }
  }

  static async saveProducts(products: Product[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (error) {
      console.log('Error saving products:', error);
    }
  }

  static async getTransactions(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log('Error getting transactions:', error);
      return [];
    }
  }

  static async saveTransactions(transactions: Transaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (error) {
      console.log('Error saving transactions:', error);
    }
  }

  static async getCustomers(): Promise<Customer[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log('Error getting customers:', error);
      return [];
    }
  }

  static async saveCustomers(customers: Customer[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (error) {
      console.log('Error saving customers:', error);
    }
  }

  static async getCart(): Promise<CartItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CART);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log('Error getting cart:', error);
      return [];
    }
  }

  static async saveCart(cart: CartItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch (error) {
      console.log('Error saving cart:', error);
    }
  }

  static async clearCart(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CART);
    } catch (error) {
      console.log('Error clearing cart:', error);
    }
  }

  static async getStores(): Promise<Store[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STORES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log('Error getting stores:', error);
      return [];
    }
  }

  static async saveStores(stores: Store[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
    } catch (error) {
      console.log('Error saving stores:', error);
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.log('Error clearing all data:', error);
    }
  }
}
