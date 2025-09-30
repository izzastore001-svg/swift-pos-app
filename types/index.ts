
export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'owner' | 'cashier';
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  description?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount?: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'non-cash' | 'qris' | 'credit';
  amountPaid: number;
  change: number;
  customerId?: string;
  cashierId: string;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  totalSpent: number;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayProfit: number;
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    transactions: number;
  }>;
}

export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  minPurchase?: number;
  isActive: boolean;
  validFrom: string;
  validTo: string;
  createdBy: string;
}
