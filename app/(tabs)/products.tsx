
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Stack } from 'expo-router';
import { Button } from '@/components/button';
import { useAuth } from '../../hooks/useAuth';
import { useProducts } from '../../hooks/useProducts';
import { Product } from '../../types';
import { colors } from '../../styles/commonStyles';
import uuid from 'react-native-uuid';

export default function ProductsScreen() {
  const { user } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct, searchProducts } = useProducts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    barcode: '',
    price: '',
    cost: '',
    stock: '',
    unit: '',
    description: '',
  });

  const filteredProducts = searchQuery.trim() 
    ? searchProducts(searchQuery) 
    : products;

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      barcode: '',
      price: '',
      cost: '',
      stock: '',
      unit: '',
      description: '',
    });
    setEditingProduct(null);
  };

  const handleAddProduct = () => {
    setShowAddModal(true);
    resetForm();
  };

  const handleEditProduct = (product: Product) => {
    setFormData({
      name: product.name,
      category: product.category,
      barcode: product.barcode,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      unit: product.unit,
      description: product.description || '',
    });
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim() || !formData.price || !formData.cost) {
      Alert.alert('Error', 'Nama, harga, dan harga modal harus diisi');
      return;
    }

    const productData = {
      name: formData.name.trim(),
      category: formData.category.trim() || 'Umum',
      barcode: formData.barcode.trim() || uuid.v4() as string,
      price: parseFloat(formData.price) || 0,
      cost: parseFloat(formData.cost) || 0,
      stock: parseInt(formData.stock) || 0,
      unit: formData.unit.trim() || 'pcs',
      description: formData.description.trim(),
      createdBy: user?.id || '',
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        Alert.alert('Berhasil', 'Produk berhasil diperbarui');
      } else {
        await addProduct(productData);
        Alert.alert('Berhasil', 'Produk berhasil ditambahkan');
      }
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.log('Error saving product:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat menyimpan produk');
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Hapus Produk',
      `Apakah Anda yakin ingin menghapus "${product.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              Alert.alert('Berhasil', 'Produk berhasil dihapus');
            } catch (error) {
              console.log('Error deleting product:', error);
              Alert.alert('Error', 'Terjadi kesalahan saat menghapus produk');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const ProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditProduct(item)}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProduct(item)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.productDetails}>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productBarcode}>Barcode: {item.barcode}</Text>
        <Text style={styles.productPrice}>Harga: {formatCurrency(item.price)}</Text>
        <Text style={styles.productCost}>Modal: {formatCurrency(item.cost)}</Text>
        <Text style={[
          styles.productStock,
          { color: item.stock > 10 ? colors.text : '#FF3B30' }
        ]}>
          Stok: {item.stock} {item.unit}
        </Text>
      </View>
      
      {item.description && (
        <Text style={styles.productDescription}>{item.description}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Manajemen Produk',
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.text,
        }} 
      />

      <View style={styles.header}>
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari produk..."
            placeholderTextColor={colors.grey}
          />
          <Button
            onPress={handleAddProduct}
            style={styles.addButton}
            size="small"
          >
            ➕ Tambah
          </Button>
        </View>
        
        <Text style={styles.productCount}>
          {filteredProducts.length} produk ditemukan
        </Text>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={ProductItem}
        keyExtractor={(item) => item.id}
        style={styles.productsList}
        contentContainerStyle={styles.productsListContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Product Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nama Produk *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Masukkan nama produk"
                  placeholderTextColor={colors.grey}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Kategori</Text>
                <TextInput
                  style={styles.input}
                  value={formData.category}
                  onChangeText={(text) => setFormData({ ...formData, category: text })}
                  placeholder="Masukkan kategori"
                  placeholderTextColor={colors.grey}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Barcode</Text>
                <TextInput
                  style={styles.input}
                  value={formData.barcode}
                  onChangeText={(text) => setFormData({ ...formData, barcode: text })}
                  placeholder="Scan atau masukkan barcode"
                  placeholderTextColor={colors.grey}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.label}>Harga Jual *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    placeholder="0"
                    placeholderTextColor={colors.grey}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroupHalf}>
                  <Text style={styles.label}>Harga Modal *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.cost}
                    onChangeText={(text) => setFormData({ ...formData, cost: text })}
                    placeholder="0"
                    placeholderTextColor={colors.grey}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.label}>Stok</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.stock}
                    onChangeText={(text) => setFormData({ ...formData, stock: text })}
                    placeholder="0"
                    placeholderTextColor={colors.grey}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroupHalf}>
                  <Text style={styles.label}>Satuan</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.unit}
                    onChangeText={(text) => setFormData({ ...formData, unit: text })}
                    placeholder="pcs"
                    placeholderTextColor={colors.grey}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Deskripsi</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Deskripsi produk (opsional)"
                  placeholderTextColor={colors.grey}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  variant="secondary"
                  onPress={() => setShowAddModal(false)}
                  style={styles.modalButton}
                >
                  Batal
                </Button>
                <Button
                  onPress={handleSaveProduct}
                  style={styles.modalButton}
                >
                  {editingProduct ? 'Perbarui' : 'Simpan'}
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey + '30',
  },
  searchSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.grey + '30',
  },
  addButton: {
    paddingHorizontal: 16,
  },
  productCount: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    padding: 16,
  },
  productCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    padding: 8,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    padding: 8,
  },
  actionButtonText: {
    fontSize: 14,
  },
  productDetails: {
    gap: 4,
  },
  productCategory: {
    fontSize: 14,
    color: colors.grey,
    fontWeight: '600',
  },
  productBarcode: {
    fontSize: 12,
    color: colors.grey,
    fontFamily: 'monospace',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productCost: {
    fontSize: 14,
    color: colors.grey,
  },
  productStock: {
    fontSize: 14,
    fontWeight: '600',
  },
  productDescription: {
    fontSize: 14,
    color: colors.grey,
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 24,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.grey + '30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
  },
});
