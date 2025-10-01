
export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'owner' | 'cashier';
  isActive: boolean;
  storeId?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  description?: string;
  image?: string;
  storeId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  storeId?: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount?: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
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
  storeId?: string;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  totalSpent: number;
  storeId?: string;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
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
  storeId?: string;
  createdBy: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  storeId?: string;
  createdBy: string;
  createdAt: string;
}

export interface Kasbon {
  id: string;
  employeeId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedAt?: string;
  storeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayProfit: number;
  totalProducts: number;
  lowStockProducts: number;
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    transactions: number;
  }>;
  salesByHour: Array<{
    hour: number;
    sales: number;
    transactions: number;
  }>;
}

export interface ReportData {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  dailyProfit: number;
  weeklyProfit: number;
  monthlyProfit: number;
  totalTransactions: number;
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
  salesByHour: Array<{
    hour: number;
    sales: number;
    transactions: number;
  }>;
}

export interface NotificationSettings {
  lowStock: boolean;
  newTransactions: boolean;
  dailyReports: boolean;
  kasbonRequests: boolean;
}

export interface PrinterSettings {
  printerName: string;
  paperSize: 'thermal58' | 'thermal80' | 'a4';
  autoReprint: boolean;
  printLogo: boolean;
}

export interface AppSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  taxRate: number;
  currency: string;
  notifications: NotificationSettings;
  printer: PrinterSettings;
  offlineMode: boolean;
  autoSync: boolean;
}
