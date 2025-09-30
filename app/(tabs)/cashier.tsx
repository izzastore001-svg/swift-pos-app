
import React, { useState, useEffect } from 'react';
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
import { useCart } from '../../hooks/useCart';
import { Storage } from '../../data/storage';
import { Transaction, CartItem } from '../../types';
import { colors } from '../../styles/commonStyles';
import uuid from 'react-native-uuid';

export default function CashierScreen() {
  const { user } = useAuth();
  const { products, searchProducts, getProductByBarcode } = useProducts();
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, getCartTotal } = useCart();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(products);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'non-cash' | 'qris' | 'credit'>('cash');

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(searchProducts(searchQuery));
    } else {
      setSearchResults(products.slice(0, 20)); // Show first 20 products
    }
  }, [searchQuery, products]);

  const handleBarcodeSearch = (barcode: string) => {
    const product = getProductByBarcode(barcode);
    if (product) {
      addToCart(product, 1);
      setSearchQuery('');
      Alert.alert('Berhasil', `${product.name} ditambahkan ke keranjang`);
    } else {
      Alert.alert('Tidak Ditemukan', 'Produk dengan barcode tersebut tidak ditemukan');
    }
  };

  const handleAddToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      if (product.stock <= 0) {
        Alert.alert('Stok Habis', 'Produk ini sedang tidak tersedia');
        return;
      }
      addToCart(product, 1);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Keranjang Kosong', 'Tambahkan produk ke keranjang terlebih dahulu');
      return;
    }
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    const total = getCartTotal();
    const paid = parseFloat(amountPaid) || 0;
    
    if (paymentMethod === 'cash' && paid < total) {
      Alert.alert('Pembayaran Kurang', 'Jumlah pembayaran kurang dari total belanja');
      return;
    }

    try {
      const transaction: Transaction = {
        id: uuid.v4() as string,
        items: cart,
        subtotal: total,
        discount: 0,
        tax: 0,
        total,
        paymentMethod,
        amountPaid: paid,
        change: paymentMethod === 'cash' ? Math.max(0, paid - total) : 0,
        cashierId: user?.id || '',
        status: 'completed',
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      };

      // Save transaction
      const transactions = await Storage.getTransactions();
      await Storage.saveTransactions([...transactions, transaction]);

      // Update product stock
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.product.id === product.id);
        if (cartItem) {
          return {
            ...product,
            stock: Math.max(0, product.stock - cartItem.quantity),
          };
        }
        return product;
      });
      await Storage.saveProducts(updatedProducts);

      // Clear cart
      await clearCart();
      
      setShowPaymentModal(false);
      setAmountPaid('');
      
      Alert.alert(
        'Transaksi Berhasil',
        `Total: ${formatCurrency(total)}\nBayar: ${formatCurrency(paid)}\nKembali: ${formatCurrency(transaction.change)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.log('Error processing payment:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat memproses pembayaran');
    }
  };

  const ProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => handleAddToCart(item.id)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
      </View>
      <View style={styles.productStock}>
        <Text style={[
          styles.stockText,
          { color: item.stock > 10 ? colors.text : '#FF3B30' }
        ]}>
          Stok: {item.stock}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const CartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>{formatCurrency(item.product.price)}</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.product.id)}
        >
          <Text style={styles.removeButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Kasir',
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.text,
        }} 
      />

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari produk atau scan barcode..."
          placeholderTextColor={colors.grey}
        />
        <Button
          onPress={() => handleBarcodeSearch(searchQuery)}
          style={styles.scanButton}
          size="small"
        >
          📷 Scan
        </Button>
      </View>

      <View style={styles.content}>
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Produk</Text>
          <FlatList
            data={searchResults}
            renderItem={ProductItem}
            keyExtractor={(item) => item.id}
            style={styles.productsList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={styles.cartSection}>
          <Text style={styles.sectionTitle}>
            Keranjang ({cart.length} item)
          </Text>
          
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Keranjang kosong</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                renderItem={CartItem}
                keyExtractor={(item) => item.product.id}
                style={styles.cartList}
                showsVerticalScrollIndicator={false}
              />
              
              <View style={styles.cartTotal}>
                <Text style={styles.totalText}>
                  Total: {formatCurrency(getCartTotal())}
                </Text>
                <Button
                  onPress={handleCheckout}
                  style={styles.checkoutButton}
                >
                  Bayar
                </Button>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pembayaran</Text>
            
            <Text style={styles.totalAmount}>
              Total: {formatCurrency(getCartTotal())}
            </Text>

            <View style={styles.paymentMethods}>
              <Text style={styles.paymentLabel}>Metode Pembayaran:</Text>
              <View style={styles.paymentButtons}>
                {(['cash', 'non-cash', 'qris', 'credit'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === method && styles.selectedPaymentMethod
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[
                      styles.paymentMethodText,
                      paymentMethod === method && styles.selectedPaymentMethodText
                    ]}>
                      {method === 'cash' ? 'Tunai' : 
                       method === 'non-cash' ? 'Non-Tunai' :
                       method === 'qris' ? 'QRIS' : 'Hutang'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {paymentMethod === 'cash' && (
              <View style={styles.amountInput}>
                <Text style={styles.paymentLabel}>Jumlah Bayar:</Text>
                <TextInput
                  style={styles.amountTextInput}
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                  placeholder="0"
                  placeholderTextColor={colors.grey}
                  keyboardType="numeric"
                />
                {parseFloat(amountPaid) > getCartTotal() && (
                  <Text style={styles.changeText}>
                    Kembalian: {formatCurrency(parseFloat(amountPaid) - getCartTotal())}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <Button
                variant="secondary"
                onPress={() => setShowPaymentModal(false)}
                style={styles.modalButton}
              >
                Batal
              </Button>
              <Button
                onPress={processPayment}
                style={styles.modalButton}
              >
                Proses
              </Button>
            </View>
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
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.grey + '30',
  },
  scanButton: {
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  productsSection: {
    flex: 1,
    padding: 16,
  },
  cartSection: {
    width: 300,
    backgroundColor: colors.backgroundAlt,
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: colors.grey + '30',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  productsList: {
    flex: 1,
  },
  productItem: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  productStock: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 16,
    color: colors.grey,
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cartItemInfo: {
    marginBottom: 8,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    color: colors.grey,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 12,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 16,
  },
  cartTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.grey + '30',
    paddingTop: 16,
    marginTop: 16,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  checkoutButton: {
    backgroundColor: colors.primary,
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
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  paymentMethods: {
    marginBottom: 24,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  paymentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.grey + '30',
  },
  selectedPaymentMethod: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentMethodText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedPaymentMethodText: {
    color: 'white',
  },
  amountInput: {
    marginBottom: 24,
  },
  amountTextInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.grey + '30',
    textAlign: 'center',
  },
  changeText: {
    fontSize: 16,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
