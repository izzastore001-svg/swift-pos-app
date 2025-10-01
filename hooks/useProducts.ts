
import { useState, useEffect } from 'react';
import { Product, Category, StockMovement } from '../types';
import { Storage } from '../data/storage';
import { sampleProducts, sampleCategories } from '../data/sampleData';
import { supabase } from '../config/supabase';
import uuid from 'react-native-uuid';
import { Alert } from 'react-native';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadProducts(),
        loadCategories(),
      ]);
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      let existingProducts = await Storage.getProducts();
      
      // Initialize with sample data if empty
      if (existingProducts.length === 0) {
        await Storage.saveProducts(sampleProducts);
        existingProducts = sampleProducts;
      }
      
      setProducts(existingProducts);
    } catch (error) {
      console.log('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      let existingCategories = await Storage.getCategories();
      
      // Initialize with sample data if empty
      if (existingCategories.length === 0) {
        await Storage.saveCategories(sampleCategories);
        existingCategories = sampleCategories;
      }
      
      setCategories(existingCategories);
    } catch (error) {
      console.log('Error loading categories:', error);
    }
  };

  const syncWithServer = async (): Promise<boolean> => {
    try {
      setSyncing(true);
      
      // Fetch products from Supabase
      const { data: serverProducts, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name
          )
        `);

      if (productsError) {
        console.log('Error fetching products from server:', productsError);
        return false;
      }

      if (serverProducts) {
        const formattedProducts: Product[] = serverProducts.map(p => ({
          id: p.id,
          name: p.name,
          categoryId: p.category_id,
          category: p.categories?.name || 'Uncategorized',
          barcode: p.barcode,
          price: p.price,
          cost: p.cost,
          stock: p.stock,
          unit: p.unit,
          description: p.description,
          image: p.image_url,
          storeId: p.store_id,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          createdBy: p.created_by,
        }));

        await Storage.saveProducts(formattedProducts);
        setProducts(formattedProducts);
      }

      // Fetch categories from Supabase
      const { data: serverCategories, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) {
        console.log('Error fetching categories from server:', categoriesError);
        return false;
      }

      if (serverCategories) {
        const formattedCategories: Category[] = serverCategories.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          storeId: c.store_id,
          createdAt: c.created_at,
        }));

        await Storage.saveCategories(formattedCategories);
        setCategories(formattedCategories);
      }

      return true;
    } catch (error) {
      console.log('Error syncing with server:', error);
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product | null> => {
    try {
      // Check if barcode already exists
      const existingProduct = products.find(p => p.barcode === productData.barcode);
      if (existingProduct) {
        Alert.alert('Error', 'Barcode sudah digunakan oleh produk lain');
        return null;
      }

      const newProduct: Product = {
        ...productData,
        id: uuid.v4() as string,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProducts = [...products, newProduct];
      await Storage.saveProducts(updatedProducts);
      setProducts(updatedProducts);

      // Add to sync queue
      await Storage.addProduct(newProduct);

      return newProduct;
    } catch (error) {
      console.log('Error adding product:', error);
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    try {
      // Check if barcode is being updated and already exists
      if (updates.barcode) {
        const existingProduct = products.find(p => p.barcode === updates.barcode && p.id !== id);
        if (existingProduct) {
          Alert.alert('Error', 'Barcode sudah digunakan oleh produk lain');
          return false;
        }
      }

      const updatedProducts = products.map(product =>
        product.id === id
          ? { ...product, ...updates, updatedAt: new Date().toISOString() }
          : product
      );
      
      await Storage.saveProducts(updatedProducts);
      setProducts(updatedProducts);

      // Add to sync queue
      await Storage.updateProduct(id, updates);

      return true;
    } catch (error) {
      console.log('Error updating product:', error);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const updatedProducts = products.filter(product => product.id !== id);
      await Storage.saveProducts(updatedProducts);
      setProducts(updatedProducts);

      // Add to sync queue
      await Storage.deleteProduct(id);

      return true;
    } catch (error) {
      console.log('Error deleting product:', error);
      return false;
    }
  };

  const updateStock = async (productId: string, newStock: number, movementType: 'in' | 'out' | 'adjustment', notes?: string, createdBy?: string): Promise<boolean> => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return false;

      const oldStock = product.stock;
      const quantity = newStock - oldStock;

      // Update product stock
      const success = await updateProduct(productId, { stock: newStock });
      if (!success) return false;

      // Record stock movement
      const stockMovement: StockMovement = {
        id: uuid.v4() as string,
        productId,
        type: movementType,
        quantity: Math.abs(quantity),
        notes,
        createdBy: createdBy || 'system',
        createdAt: new Date().toISOString(),
      };

      await Storage.addStockMovement(stockMovement);

      return true;
    } catch (error) {
      console.log('Error updating stock:', error);
      return false;
    }
  };

  const adjustStock = async (productId: string, adjustment: number, notes?: string, createdBy?: string): Promise<boolean> => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return false;

      const newStock = Math.max(0, product.stock + adjustment);
      return await updateStock(productId, newStock, 'adjustment', notes, createdBy);
    } catch (error) {
      console.log('Error adjusting stock:', error);
      return false;
    }
  };

  const searchProducts = (query: string): Product[] => {
    if (!query.trim()) return products;
    
    const lowercaseQuery = query.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.barcode.includes(query) ||
      product.category.toLowerCase().includes(lowercaseQuery) ||
      product.description?.toLowerCase().includes(lowercaseQuery)
    );
  };

  const getProductByBarcode = (barcode: string): Product | undefined => {
    return products.find(product => product.barcode === barcode);
  };

  const getProductsByCategory = (categoryId: string): Product[] => {
    return products.filter(product => product.categoryId === categoryId);
  };

  const getLowStockProducts = (threshold: number = 10): Product[] => {
    return products.filter(product => product.stock <= threshold);
  };

  const getTopSellingProducts = async (limit: number = 10): Promise<Product[]> => {
    try {
      const transactions = await Storage.getTransactions();
      const productSales: { [key: string]: number } = {};

      // Calculate total sales for each product
      transactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const productId = item.product.id;
          productSales[productId] = (productSales[productId] || 0) + item.quantity;
        });
      });

      // Sort products by sales
      const sortedProducts = products
        .map(product => ({
          ...product,
          totalSold: productSales[product.id] || 0,
        }))
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, limit);

      return sortedProducts;
    } catch (error) {
      console.log('Error getting top selling products:', error);
      return [];
    }
  };

  const generateBarcode = (): string => {
    // Generate a simple barcode (you can implement more sophisticated logic)
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp.slice(-8)}${random}`;
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt'>): Promise<Category | null> => {
    try {
      const newCategory: Category = {
        ...categoryData,
        id: uuid.v4() as string,
        createdAt: new Date().toISOString(),
      };

      const updatedCategories = [...categories, newCategory];
      await Storage.saveCategories(updatedCategories);
      setCategories(updatedCategories);

      return newCategory;
    } catch (error) {
      console.log('Error adding category:', error);
      return null;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<boolean> => {
    try {
      const updatedCategories = categories.map(category =>
        category.id === id ? { ...category, ...updates } : category
      );
      
      await Storage.saveCategories(updatedCategories);
      setCategories(updatedCategories);

      return true;
    } catch (error) {
      console.log('Error updating category:', error);
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      // Check if category is being used by products
      const productsUsingCategory = products.filter(p => p.categoryId === id);
      if (productsUsingCategory.length > 0) {
        Alert.alert('Error', 'Kategori tidak dapat dihapus karena masih digunakan oleh produk');
        return false;
      }

      const updatedCategories = categories.filter(category => category.id !== id);
      await Storage.saveCategories(updatedCategories);
      setCategories(updatedCategories);

      return true;
    } catch (error) {
      console.log('Error deleting category:', error);
      return false;
    }
  };

  const getProductStats = () => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);
    const totalCost = products.reduce((sum, product) => sum + (product.cost * product.stock), 0);
    const lowStockCount = getLowStockProducts().length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;

    return {
      totalProducts,
      totalValue,
      totalCost,
      lowStockCount,
      outOfStockCount,
      averagePrice: totalProducts > 0 ? totalValue / totalProducts : 0,
    };
  };

  return {
    products,
    categories,
    loading,
    syncing,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    adjustStock,
    searchProducts,
    getProductByBarcode,
    getProductsByCategory,
    getLowStockProducts,
    getTopSellingProducts,
    generateBarcode,
    addCategory,
    updateCategory,
    deleteCategory,
    getProductStats,
    syncWithServer,
    refreshProducts: loadProducts,
    refreshCategories: loadCategories,
    refreshData: loadData,
  };
};
