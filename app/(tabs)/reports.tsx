
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { Storage } from '../../data/storage';
import { Transaction, Product } from '../../types';
import { colors } from '../../styles/commonStyles';

const { width } = Dimensions.get('window');

interface ReportData {
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

export default function ReportsScreen() {
  const [reportData, setReportData] = useState<ReportData>({
    dailySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    dailyProfit: 0,
    weeklyProfit: 0,
    monthlyProfit: 0,
    totalTransactions: 0,
    topProducts: [],
    salesByHour: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      const transactions = await Storage.getTransactions();
      const products = await Storage.getProducts();
      
      const completedTransactions = transactions.filter(t => t.status === 'completed');
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Daily data
      const dailyTransactions = completedTransactions.filter(
        t => new Date(t.createdAt) >= today
      );
      const dailySales = dailyTransactions.reduce((sum, t) => sum + t.total, 0);
      const dailyProfit = calculateProfit(dailyTransactions);

      // Weekly data
      const weeklyTransactions = completedTransactions.filter(
        t => new Date(t.createdAt) >= weekAgo
      );
      const weeklySales = weeklyTransactions.reduce((sum, t) => sum + t.total, 0);
      const weeklyProfit = calculateProfit(weeklyTransactions);

      // Monthly data
      const monthlyTransactions = completedTransactions.filter(
        t => new Date(t.createdAt) >= monthAgo
      );
      const monthlySales = monthlyTransactions.reduce((sum, t) => sum + t.total, 0);
      const monthlyProfit = calculateProfit(monthlyTransactions);

      // Top products
      const productSales = new Map<string, { quantity: number; revenue: number }>();
      completedTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const existing = productSales.get(item.product.id) || { quantity: 0, revenue: 0 };
          productSales.set(item.product.id, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.subtotal,
          });
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([productId, data]) => ({
          product: products.find(p => p.id === productId)!,
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .filter(item => item.product)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Sales by hour
      const hourlyData = new Array(24).fill(0).map((_, hour) => ({
        hour,
        sales: 0,
        transactions: 0,
      }));

      dailyTransactions.forEach(transaction => {
        const hour = new Date(transaction.createdAt).getHours();
        hourlyData[hour].sales += transaction.total;
        hourlyData[hour].transactions += 1;
      });

      setReportData({
        dailySales,
        weeklySales,
        monthlySales,
        dailyProfit,
        weeklyProfit,
        monthlyProfit,
        totalTransactions: completedTransactions.length,
        topProducts,
        salesByHour: hourlyData.filter(h => h.sales > 0),
      });
    } catch (error) {
      console.log('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfit = (transactions: Transaction[]) => {
    return transactions.reduce((totalProfit, transaction) => {
      const transactionProfit = transaction.items.reduce((itemProfit, item) => {
        return itemProfit + ((item.product.price - item.product.cost) * item.quantity);
      }, 0);
      return totalProfit + transactionProfit;
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSalesData = () => {
    switch (selectedPeriod) {
      case 'daily':
        return { sales: reportData.dailySales, profit: reportData.dailyProfit };
      case 'weekly':
        return { sales: reportData.weeklySales, profit: reportData.weeklyProfit };
      case 'monthly':
        return { sales: reportData.monthlySales, profit: reportData.monthlyProfit };
      default:
        return { sales: 0, profit: 0 };
    }
  };

  const StatCard = ({ title, value, subtitle, color = colors.primary }: {
    title: string;
    value: string;
    subtitle?: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const currentData = getSalesData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Memuat laporan...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Laporan Penjualan',
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.text,
        }} 
      />

      <View style={styles.header}>
        <Text style={styles.title}>📊 Laporan Penjualan</Text>
        
        <View style={styles.periodSelector}>
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.selectedPeriodButton
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.selectedPeriodButtonText
              ]}>
                {period === 'daily' ? 'Harian' : 
                 period === 'weekly' ? 'Mingguan' : 'Bulanan'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.statsSection}>
        <StatCard
          title={`Penjualan ${selectedPeriod === 'daily' ? 'Hari Ini' : 
                              selectedPeriod === 'weekly' ? '7 Hari Terakhir' : 
                              '30 Hari Terakhir'}`}
          value={formatCurrency(currentData.sales)}
          color={colors.primary}
        />
        
        <StatCard
          title={`Keuntungan ${selectedPeriod === 'daily' ? 'Hari Ini' : 
                               selectedPeriod === 'weekly' ? '7 Hari Terakhir' : 
                               '30 Hari Terakhir'}`}
          value={formatCurrency(currentData.profit)}
          subtitle={`Margin: ${currentData.sales > 0 ? 
            ((currentData.profit / currentData.sales) * 100).toFixed(1) : 0}%`}
          color="#34C759"
        />
        
        <StatCard
          title="Total Transaksi"
          value={reportData.totalTransactions.toString()}
          subtitle="Semua waktu"
          color="#FF9500"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Produk Terlaris</Text>
        {reportData.topProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Belum ada data penjualan</Text>
          </View>
        ) : (
          reportData.topProducts.map((item, index) => (
            <View key={item.product.id} style={styles.topProductItem}>
              <View style={styles.topProductRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.topProductInfo}>
                <Text style={styles.topProductName}>{item.product.name}</Text>
                <Text style={styles.topProductStats}>
                  {item.quantity} terjual • {formatCurrency(item.revenue)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Jam Ramai Hari Ini</Text>
        {reportData.salesByHour.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Belum ada transaksi hari ini</Text>
          </View>
        ) : (
          reportData.salesByHour
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5)
            .map((hourData) => (
              <View key={hourData.hour} style={styles.hourItem}>
                <Text style={styles.hourTime}>
                  {hourData.hour.toString().padStart(2, '0')}:00
                </Text>
                <View style={styles.hourStats}>
                  <Text style={styles.hourSales}>
                    {formatCurrency(hourData.sales)}
                  </Text>
                  <Text style={styles.hourTransactions}>
                    {hourData.transactions} transaksi
                  </Text>
                </View>
              </View>
            ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Ringkasan Periode</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Harian</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(reportData.dailySales)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Mingguan</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(reportData.weeklySales)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Bulanan</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(reportData.monthlySales)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.grey,
  },
  header: {
    padding: 20,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  selectedPeriodButton: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  selectedPeriodButtonText: {
    color: 'white',
  },
  statsSection: {
    padding: 20,
    gap: 16,
  },
  statCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statTitle: {
    fontSize: 14,
    color: colors.grey,
    fontWeight: '600',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.grey,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.grey,
    textAlign: 'center',
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  topProductRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  topProductStats: {
    fontSize: 14,
    color: colors.grey,
  },
  hourItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  hourTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  hourStats: {
    alignItems: 'flex-end',
  },
  hourSales: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  hourTransactions: {
    fontSize: 12,
    color: colors.grey,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.grey,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
});
