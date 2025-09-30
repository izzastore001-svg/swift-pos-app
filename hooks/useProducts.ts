
import { useState, useEffect } from 'react';
import { Product } from '../types';
import { Storage } from '../data/storage';
import { sampleProducts } from '../data/sampleData';
import uuid from 'react-native-uuid';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProduct: Product = {
        ...productData,
        id: uuid.v4() as string,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProducts = [...products, newProduct];
      await Storage.saveProducts(updatedProducts);
      setProducts(updatedProducts);
      return newProduct;
    } catch (error) {
      console.log('Error adding product:', error);
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProducts = products.map(product =>
        product.id === id
          ? { ...product, ...updates, updatedAt: new Date().toISOString() }
          : product
      );
      
      await Storage.saveProducts(updatedProducts);
      setProducts(updatedProducts);
      return true;
    } catch (error) {
      console.log('Error updating product:', error);
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const updatedProducts = products.filter(product => product.id !== id);
      await Storage.saveProducts(updatedProducts);
      setProducts(updatedProducts);
      return true;
    } catch (error) {
      console.log('Error deleting product:', error);
      return false;
    }
  };

  const searchProducts = (query: string) => {
    if (!query.trim()) return products;
    
    const lowercaseQuery = query.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.barcode.includes(query) ||
      product.category.toLowerCase().includes(lowercaseQuery)
    );
  };

  const getProductByBarcode = (barcode: string) => {
    return products.find(product => product.barcode === barcode);
  };

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductByBarcode,
    refreshProducts: loadProducts,
  };
};
