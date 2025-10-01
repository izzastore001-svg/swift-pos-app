
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  User, Product, Transaction, Customer, Store, CartItem, 
  Category, Discount, StockMovement, AuditLog, Expense, Kasbon, AppSettings 
} from '../types';
import { supabase } from '../config/supabase';
import NetInfo from '@react-native-community/netinfo';

const STORAGE_KEYS = {
  USERS: '@pos_users',
  PRODUCTS: '@pos_products',
  TRANSACTIONS: '@pos_transactions',
  CUSTOMERS: '@pos_customers',
  STORES: '@pos_stores',
  CART: '@pos_cart',
  CURRENT_USER: '@pos_current_user',
  CATEGORIES: '@pos_categories',
  DISCOUNTS: '@pos_discounts',
  STOCK_MOVEMENTS: '@pos_stock_movements',
  AUDIT_LOGS: '@pos_audit_logs',
  EXPENSES: '@pos_expenses',
  KASBON: '@pos_kasbon',
  SETTINGS: '@pos_settings',
  SYNC_QUEUE: '@pos_sync_queue',
  LAST_SYNC: '@pos_last_sync',
};

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: string;
}

export class Storage {
  // Generic storage methods with error handling
  private static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      console.log(`Successfully saved ${key}`);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw new Error(`Failed to save ${key}`);
    }
  }

  private static async getItem<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue != null) {
        return JSON.parse(jsonValue);
      }
      return defaultValue;
    } catch (error) {
      console.error(`Error loading ${key}:`, error);
      return defaultValue;
    }
  }

  private static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`Successfully removed ${key}`);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
    }
  }

  // Network status check
  private static async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
  }

  // Sync queue management
  private static async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): Promise<void> {
    const queue = await this.getSyncQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    queue.push(newItem);
    await this.setItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  private static async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.getItem(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  private static async clearSyncQueue(): Promise<void> {
    await this.setItem(STORAGE_KEYS.SYNC_QUEUE, []);
  }

  // Auto-sync functionality
  static async syncWithServer(): Promise<boolean> {
    try {
      const isConnected = await this.isOnline();
      if (!isConnected) {
        console.log('No internet connection, skipping sync');
        return false;
      }

      const queue = await this.getSyncQueue();
      if (queue.length === 0) {
        console.log('No items to sync');
        return true;
      }

      console.log(`Syncing ${queue.length} items...`);
      
      for (const item of queue) {
        try {
          await this.syncItem(item);
        } catch (error) {
          console.error('Error syncing item:', error);
          // Continue with other items
        }
      }

      await this.clearSyncQueue();
      await this.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      console.log('Sync completed successfully');
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  }

  private static async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, table, data } = item;
    
    switch (table) {
      case 'products':
        if (type === 'create') {
          await supabase.from('products').insert(data);
        } else if (type === 'update') {
          await supabase.from('products').update(data).eq('id', data.id);
        } else if (type === 'delete') {
          await supabase.from('products').delete().eq('id', data.id);
        }
        break;
      case 'transactions':
        if (type === 'create') {
          await supabase.from('transactions').insert(data);
        }
        break;
      // Add more cases for other tables
    }
  }

  // User management
  static async getUsers(): Promise<User[]> {
    return await this.getItem(STORAGE_KEYS.USERS, []);
  }

  static async saveUsers(users: User[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.USERS, users);
  }

  static async getCurrentUser(): Promise<User | null> {
    return await this.getItem(STORAGE_KEYS.CURRENT_USER, null);
  }

  static async setCurrentUser(user: User | null): Promise<void> {
    await this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Product management
  static async getProducts(): Promise<Product[]> {
    return await this.getItem(STORAGE_KEYS.PRODUCTS, []);
  }

  static async saveProducts(products: Product[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.PRODUCTS, products);
    
    // Add to sync queue if online
    const isConnected = await this.isOnline();
    if (isConnected) {
      await this.addToSyncQueue({
        type: 'update',
        table: 'products',
        data: products,
      });
    }
  }

  static async addProduct(product: Product): Promise<void> {
    const products = await this.getProducts();
    products.push(product);
    await this.saveProducts(products);
    
    await this.addToSyncQueue({
      type: 'create',
      table: 'products',
      data: product,
    });
  }

  static async updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      await this.saveProducts(products);
      
      await this.addToSyncQueue({
        type: 'update',
        table: 'products',
        data: products[index],
      });
    }
  }

  static async deleteProduct(productId: string): Promise<void> {
    const products = await this.getProducts();
    const filteredProducts = products.filter(p => p.id !== productId);
    await this.saveProducts(filteredProducts);
    
    await this.addToSyncQueue({
      type: 'delete',
      table: 'products',
      data: { id: productId },
    });
  }

  // Transaction management
  static async getTransactions(): Promise<Transaction[]> {
    return await this.getItem(STORAGE_KEYS.TRANSACTIONS, []);
  }

  static async saveTransaction(transaction: Transaction): Promise<void> {
    const transactions = await this.getTransactions();
    transactions.push(transaction);
    await this.setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
    
    await this.addToSyncQueue({
      type: 'create',
      table: 'transactions',
      data: transaction,
    });
  }

  static async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<void> {
    const transactions = await this.getTransactions();
    const index = transactions.findIndex(t => t.id === transactionId);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...updates };
      await this.setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
      
      await this.addToSyncQueue({
        type: 'update',
        table: 'transactions',
        data: transactions[index],
      });
    }
  }

  // Customer management
  static async getCustomers(): Promise<Customer[]> {
    return await this.getItem(STORAGE_KEYS.CUSTOMERS, []);
  }

  static async saveCustomers(customers: Customer[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.CUSTOMERS, customers);
  }

  static async addCustomer(customer: Customer): Promise<void> {
    const customers = await this.getCustomers();
    customers.push(customer);
    await this.saveCustomers(customers);
    
    await this.addToSyncQueue({
      type: 'create',
      table: 'customers',
      data: customer,
    });
  }

  // Cart management
  static async getCart(): Promise<CartItem[]> {
    return await this.getItem(STORAGE_KEYS.CART, []);
  }

  static async saveCart(cart: CartItem[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.CART, cart);
  }

  static async clearCart(): Promise<void> {
    await this.setItem(STORAGE_KEYS.CART, []);
  }

  // Categories
  static async getCategories(): Promise<Category[]> {
    return await this.getItem(STORAGE_KEYS.CATEGORIES, []);
  }

  static async saveCategories(categories: Category[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.CATEGORIES, categories);
  }

  // Discounts
  static async getDiscounts(): Promise<Discount[]> {
    return await this.getItem(STORAGE_KEYS.DISCOUNTS, []);
  }

  static async saveDiscounts(discounts: Discount[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.DISCOUNTS, discounts);
  }

  // Stock movements
  static async getStockMovements(): Promise<StockMovement[]> {
    return await this.getItem(STORAGE_KEYS.STOCK_MOVEMENTS, []);
  }

  static async addStockMovement(movement: StockMovement): Promise<void> {
    const movements = await this.getStockMovements();
    movements.push(movement);
    await this.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, movements);
    
    await this.addToSyncQueue({
      type: 'create',
      table: 'stock_movements',
      data: movement,
    });
  }

  // Audit logs
  static async addAuditLog(log: AuditLog): Promise<void> {
    const logs = await this.getItem(STORAGE_KEYS.AUDIT_LOGS, []);
    logs.push(log);
    await this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
    
    await this.addToSyncQueue({
      type: 'create',
      table: 'audit_logs',
      data: log,
    });
  }

  // Expenses
  static async getExpenses(): Promise<Expense[]> {
    return await this.getItem(STORAGE_KEYS.EXPENSES, []);
  }

  static async addExpense(expense: Expense): Promise<void> {
    const expenses = await this.getExpenses();
    expenses.push(expense);
    await this.setItem(STORAGE_KEYS.EXPENSES, expenses);
    
    await this.addToSyncQueue({
      type: 'create',
      table: 'expenses',
      data: expense,
    });
  }

  // Kasbon
  static async getKasbon(): Promise<Kasbon[]> {
    return await this.getItem(STORAGE_KEYS.KASBON, []);
  }

  static async addKasbon(kasbon: Kasbon): Promise<void> {
    const kasbonList = await this.getKasbon();
    kasbonList.push(kasbon);
    await this.setItem(STORAGE_KEYS.KASBON, kasbonList);
    
    await this.addToSyncQueue({
      type: 'create',
      table: 'kasbon',
      data: kasbon,
    });
  }

  static async updateKasbon(kasbonId: string, updates: Partial<Kasbon>): Promise<void> {
    const kasbonList = await this.getKasbon();
    const index = kasbonList.findIndex(k => k.id === kasbonId);
    if (index !== -1) {
      kasbonList[index] = { ...kasbonList[index], ...updates };
      await this.setItem(STORAGE_KEYS.KASBON, kasbonList);
      
      await this.addToSyncQueue({
        type: 'update',
        table: 'kasbon',
        data: kasbonList[index],
      });
    }
  }

  // Settings
  static async getSettings(): Promise<AppSettings | null> {
    return await this.getItem(STORAGE_KEYS.SETTINGS, null);
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    await this.setItem(STORAGE_KEYS.SETTINGS, settings);
  }

  // Utility methods
  static async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }

  static async getLastSyncTime(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.LAST_SYNC, null);
  }

  static async exportData(): Promise<string> {
    try {
      const data = {
        users: await this.getUsers(),
        products: await this.getProducts(),
        transactions: await this.getTransactions(),
        customers: await this.getCustomers(),
        categories: await this.getCategories(),
        discounts: await this.getDiscounts(),
        expenses: await this.getExpenses(),
        kasbon: await this.getKasbon(),
        settings: await this.getSettings(),
        exportedAt: new Date().toISOString(),
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  static async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.users) await this.saveUsers(data.users);
      if (data.products) await this.saveProducts(data.products);
      if (data.customers) await this.saveCustomers(data.customers);
      if (data.categories) await this.saveCategories(data.categories);
      if (data.discounts) await this.saveDiscounts(data.discounts);
      if (data.settings) await this.saveSettings(data.settings);
      
      console.log('Data imported successfully');
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}
