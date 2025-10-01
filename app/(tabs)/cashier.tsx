
import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { Stack } from 'expo-router';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Camera } from 'expo-camera';
import { Storage } from '../../data/storage';
import uuid from 'react-native-uuid';
import { Transaction, CartItem, Customer, Discount } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { useProducts } from '../../hooks/useProducts';
import { Button } from '@/components/button';
import { colors } from '../../styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

const CashierScreen = () => {
  const { user } = useAuth();
  const { products, searchProducts, getProductByBarcode, updateStock } = useProducts();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartSubtotal,
    getCartDiscount,
    getCartTotal,
    getTax,
    getCartItemCount,
    validateCart,
    appliedDiscount,
    applyCartDiscount,
  } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'non-cash' | 'qris' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
    requestCameraPermission();
  }, []);

  useEffect(() => {
    const filtered = searchProducts(searchQuery);
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const loadData = async () => {
    try {
      const [customersData, discountsData] = await Promise.all([
        Storage.getCustomers(),
        Storage.getDiscounts(),
      ]);
      setCustomers(customersData);
      setDiscounts(discountsData.filter(d => d.isActive));
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    setShowScanner(false);
    Vibration.vibrate(100);
    
    const product = getProductByBarcode(data);
    if (product) {
      handleAddToCart(product.id);
      Alert.alert('Produk Ditemukan', `${product.name} ditambahkan ke keranjang`);
    } else {
      Alert.alert('Produk Tidak Ditemukan', `Barcode ${data} tidak ditemukan dalam database`);
    }
  };

  const handleAddToCart = async (productId: string) => {
    const success = await addToCart(products.find(p => p.id === productId)!, 1);
    if (!success) {
      // Error already handled in useCart
    }
  };

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    await updateQuantity(productId, newQuantity);
  };

  const handleRemoveFromCart = async (productId: string) => {
    await removeFromCart(productId);
  };

  const handleCustomerSearch = async (phone: string) => {
    const customer = customers.find(c => c.phone === phone);
    if (customer) {
      setSelectedCustomer(customer);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
    } else {
      setSelectedCustomer(null);
      setCustomerName('');
    }
  };

  const handleAddCustomer = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Error', 'Nama dan nomor telepon harus diisi');
      return;
    }

    const newCustomer: Customer = {
      id: uuid.v4() as string,
      name: customerName.trim(),
      phone: customerPhone.trim(),
      points: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };

    await Storage.addCustomer(newCustomer);
    setCustomers([...customers, newCustomer]);
    setSelectedCustomer(newCustomer);
    setShowCustomerModal(false);
  };

  const handleApplyDiscount = (discount: Discount) => {
    applyCartDiscount(discount);
    setShowDiscountModal(false);
    Alert.alert('Diskon Diterapkan', `${discount.name} berhasil diterapkan`);
  };

  const handleRemoveDiscount = () => {
    applyCartDiscount(null);
    Alert.alert('Diskon Dihapus', 'Diskon berhasil dihapus');
  };

  const handleCheckout = () => {
    const validation = validateCart();
    if (!validation.isValid) {
      Alert.alert('Error', validation.errors.join('\n'));
      return;
    }

    setShowPayment(true);
    setAmountPaid(getCartTotal().toString());
  };

  const processPayment = async () => {
    try {
      setLoading(true);

      const total = getCartTotal();
      const paid = parseFloat(amountPaid) || 0;

      if (paymentMethod === 'cash' && paid < total) {
        Alert.alert('Error', 'Jumlah pembayaran kurang dari total');
        return;
      }

      const change = paymentMethod === 'cash' ? Math.max(0, paid - total) : 0;

      // Generate transaction number
      const transactionNumber = `TRX-${Date.now()}`;

      // Create transaction
      const transaction: Transaction = {
        id: uuid.v4() as string,
        transactionNumber,
        items: cart,
        subtotal: getCartSubtotal(),
        discount: getCartDiscount(),
        tax: getTax(),
        total,
        paymentMethod,
        amountPaid: paid,
        change,
        customerId: selectedCustomer?.id,
        cashierId: user!.id,
        status: 'completed',
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      };

      // Save transaction
      await Storage.saveTransaction(transaction);

      // Update product stock
      for (const item of cart) {
        await updateStock(
          item.product.id,
          item.product.stock - item.quantity,
          'out',
          `Penjualan ${transactionNumber}`,
          user!.id
        );
      }

      // Update customer points and total spent
      if (selectedCustomer) {
        const pointsEarned = Math.floor(total / 10000); // 1 point per 10k
        const updatedCustomer = {
          ...selectedCustomer,
          points: selectedCustomer.points + pointsEarned,
          totalSpent: selectedCustomer.totalSpent + total,
        };
        
        const updatedCustomers = customers.map(c => 
          c.id === selectedCustomer.id ? updatedCustomer : c
        );
        await Storage.saveCustomers(updatedCustomers);
        setCustomers(updatedCustomers);
      }

      // Clear cart and reset state
      await clearCart();
      setShowPayment(false);
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
      setAmountPaid('');
      setPaymentMethod('cash');

      // Show success message
      Alert.alert(
        'Transaksi Berhasil',
        `Transaksi ${transactionNumber} berhasil disimpan\n` +
        `Total: ${formatCurrency(total)}\n` +
        `Bayar: ${formatCurrency(paid)}\n` +
        `Kembalian: ${formatCurrency(change)}`,
        [
          { text: 'Cetak Struk', onPress: () => printReceipt(transaction) },
          { text: 'OK' }
        ]
      );

      // Auto sync if online
      await Storage.syncWithServer();
    } catch (error) {
      console.log('Error processing payment:', error);
      Alert.alert('Error', 'Gagal memproses pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = async (transaction: Transaction) => {
    // TODO: Implement thermal printer integration
    Alert.alert('Info', 'Fitur cetak struk akan segera tersedia');
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => handleAddToCart(item.id)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
        <Text style={styles.productStock}>Stok: {item.stock} {item.unit}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddToCart(item.id)}
      >
        <IconSymbol name="plus" size={20} color={colors.background} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>{formatCurrency(item.product.price)}</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.product.id, item.quantity - 1)}
        >
          <IconSymbol name="minus" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleQuantityChange(item.product.id, item.quantity + 1)}
        >
          <IconSymbol name="plus" size={16} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFromCart(item.product.id)}
        >
          <IconSymbol name="trash" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemSubtotal}>{formatCurrency(item.subtotal)}</Text>
    </View>
  );

  if (showScanner) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Scan Barcode' }} />
        {hasPermission === null ? (
          <Text>Meminta izin kamera...</Text>
        ) : hasPermission === false ? (
          <Text>Tidak ada akses kamera</Text>
        ) : (
          <BarCodeScanner
            onBarCodeScanned={handleBarcodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={styles.scannerOverlay}>
          <TouchableOpacity
            style={styles.closeScannerButton}
            onPress={() => setShowScanner(false)}
          >
            <IconSymbol name="xmark" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Kasir' }} />
      
      <View style={isTablet ? styles.tabletLayout : styles.mobileLayout}>
        {/* Product Search Section */}
        <View style={isTablet ? styles.leftPanel : styles.fullWidth}>
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Cari produk..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => setShowScanner(true)}
              >
                <IconSymbol name="qrcode.viewfinder" size={24} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            style={styles.productList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Cart Section */}
        <View style={isTablet ? styles.rightPanel : styles.fullWidth}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Keranjang ({getCartItemCount()})</Text>
            {cart.length > 0 && (
              <TouchableOpacity
                style={styles.clearCartButton}
                onPress={() => {
                  Alert.alert(
                    'Konfirmasi',
                    'Hapus semua item dari keranjang?',
                    [
                      { text: 'Batal', style: 'cancel' },
                      { text: 'Hapus', onPress: clearCart }
                    ]
                  );
                }}
              >
                <IconSymbol name="trash" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <IconSymbol name="cart" size={48} color={colors.grey} />
              <Text style={styles.emptyCartText}>Keranjang kosong</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.product.id}
                style={styles.cartList}
                showsVerticalScrollIndicator={false}
              />

              {/* Cart Summary */}
              <View style={styles.cartSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(getCartSubtotal())}</Text>
                </View>
                
                {appliedDiscount && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Diskon ({appliedDiscount.name}):</Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>
                      -{formatCurrency(getCartDiscount())}
                    </Text>
                  </View>
                )}
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Pajak (10%):</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(getTax())}</Text>
                </View>
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>{formatCurrency(getCartTotal())}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.customerButton}
                  onPress={() => setShowCustomerModal(true)}
                >
                  <IconSymbol name="person" size={20} color={colors.primary} />
                  <Text style={styles.customerButtonText}>
                    {selectedCustomer ? selectedCustomer.name : 'Pilih Customer'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.discountButton}
                  onPress={() => setShowDiscountModal(true)}
                >
                  <IconSymbol name="percent" size={20} color={colors.primary} />
                  <Text style={styles.discountButtonText}>
                    {appliedDiscount ? appliedDiscount.name : 'Diskon'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Button
                onPress={handleCheckout}
                style={styles.checkoutButton}
              >
                Checkout
              </Button>
            </>
          )}
        </View>
      </View>

      {/* Customer Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Nomor telepon customer"
              value={customerPhone}
              onChangeText={(text) => {
                setCustomerPhone(text);
                handleCustomerSearch(text);
              }}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Nama customer"
              value={customerName}
              onChangeText={setCustomerName}
              editable={!selectedCustomer}
            />

            {selectedCustomer && (
              <View style={styles.customerInfo}>
                <Text style={styles.customerInfoText}>
                  Poin: {selectedCustomer.points}
                </Text>
                <Text style={styles.customerInfoText}>
                  Total Belanja: {formatCurrency(selectedCustomer.totalSpent)}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Button
                onPress={() => setShowCustomerModal(false)}
                variant="secondary"
                style={styles.modalButton}
              >
                Batal
              </Button>
              <Button
                onPress={selectedCustomer ? () => setShowCustomerModal(false) : handleAddCustomer}
                style={styles.modalButton}
              >
                {selectedCustomer ? 'Pilih' : 'Tambah'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Discount Modal */}
      <Modal
        visible={showDiscountModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Diskon</Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.discountList}>
              {appliedDiscount && (
                <TouchableOpacity
                  style={[styles.discountItem, styles.removeDiscountItem]}
                  onPress={handleRemoveDiscount}
                >
                  <Text style={styles.discountName}>Hapus Diskon</Text>
                  <IconSymbol name="trash" size={20} color={colors.text} />
                </TouchableOpacity>
              )}

              {discounts.map((discount) => (
                <TouchableOpacity
                  key={discount.id}
                  style={styles.discountItem}
                  onPress={() => handleApplyDiscount(discount)}
                >
                  <View>
                    <Text style={styles.discountName}>{discount.name}</Text>
                    <Text style={styles.discountDescription}>
                      {discount.type === 'percentage' 
                        ? `${discount.value}%` 
                        : formatCurrency(discount.value)
                      }
                      {discount.minPurchase && 
                        ` (Min. ${formatCurrency(discount.minPurchase)})`
                      }
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.grey} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPayment}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pembayaran</Text>
              <TouchableOpacity onPress={() => setShowPayment(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentSummary}>
              <Text style={styles.paymentTotal}>
                Total: {formatCurrency(getCartTotal())}
              </Text>
            </View>

            <View style={styles.paymentMethods}>
              {(['cash', 'non-cash', 'qris', 'credit'] as const).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethod,
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
                     method === 'qris' ? 'QRIS' : 'Kredit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentMethod === 'cash' && (
              <TextInput
                style={styles.amountInput}
                placeholder="Jumlah bayar"
                value={amountPaid}
                onChangeText={setAmountPaid}
                keyboardType="numeric"
              />
            )}

            {paymentMethod === 'cash' && amountPaid && (
              <View style={styles.changeInfo}>
                <Text style={styles.changeText}>
                  Kembalian: {formatCurrency(Math.max(0, parseFloat(amountPaid) - getCartTotal()))}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Button
                onPress={() => setShowPayment(false)}
                variant="secondary"
                style={styles.modalButton}
              >
                Batal
              </Button>
              <Button
                onPress={processPayment}
                loading={loading}
                style={styles.modalButton}
              >
                Bayar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabletLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileLayout: {
    flex: 1,
  },
  leftPanel: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.grey + '30',
  },
  rightPanel: {
    width: isTablet ? 400 : '100%',
    backgroundColor: colors.backgroundAlt,
  },
  fullWidth: {
    flex: 1,
  },
  searchSection: {
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey + '30',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.grey + '50',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    marginRight: 12,
  },
  scanButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productList: {
    flex: 1,
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
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
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: colors.grey,
  },
  addButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey + '30',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  clearCartButton: {
    padding: 8,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 16,
    color: colors.grey,
    marginTop: 16,
  },
  cartList: {
    flex: 1,
    padding: 16,
  },
  cartItem: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  cartItemInfo: {
    marginBottom: 12,
  },
  cartItemName: {
    fontSize: 16,
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
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: colors.grey + '50',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginHorizontal: 16,
  },
  removeButton: {
    padding: 8,
  },
  cartItemSubtotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'right',
    marginTop: 8,
  },
  cartSummary: {
    backgroundColor: colors.card,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  discountValue: {
    color: colors.accent,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.grey + '30',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  customerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  customerButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
  },
  discountButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  discountButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
  },
  checkoutButton: {
    margin: 16,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  closeScannerButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.text + '80',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.grey + '50',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
  customerInfo: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  customerInfoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  discountList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  discountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  removeDiscountItem: {
    backgroundColor: colors.backgroundAlt,
  },
  discountName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  discountDescription: {
    fontSize: 14,
    color: colors.grey,
  },
  paymentSummary: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  paymentTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    margin: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentMethod: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  selectedPaymentMethodText: {
    color: colors.primary,
  },
  amountInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.grey + '50',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.background,
    fontSize: 18,
    textAlign: 'center',
  },
  changeInfo: {
    backgroundColor: colors.accent + '10',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  changeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },
});

export default CashierScreen;
