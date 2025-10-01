
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Transaction, Product, DashboardStats } from '../../types';
import { Storage } from '../../data/storage';
import { commonStyles, colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { IconSymbol } from '@/components/IconSymbol';

const { width } = Dimensions.get('window');
const chartWidth = width - 32;

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
}

const DashboardScreen = () => {
  const { user, isOwner } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    todayProfit: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    topProducts: [],
    peakHours: [],
    salesByHour: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [transactions, products] = await Promise.all([
        Storage.getTransactions(),
        Storage.getProducts(),
      ]);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      let startDate: Date;
      switch (selectedPeriod) {
        case 'week':
          startDate = weekAgo;
          break;
        case 'month':
          startDate = monthAgo;
          break;
        default:
          startDate = today;
      }

      // Filter transactions by period
      const periodTransactions = transactions.filter(t => 
        new Date(t.createdAt) >= startDate && t.status === 'completed'
      );

      // Calculate basic stats
      const totalSales = periodTransactions.reduce((sum, t) => sum + t.total, 0);
      const totalProfit = periodTransactions.reduce((sum, t) => {
        const profit = t.items.reduce((itemSum, item) => {
          const itemProfit = (item.product.price - item.product.cost) * item.quantity;
          return itemSum + itemProfit;
        }, 0);
        return sum + profit;
      }, 0);

      // Calculate top products
      const productSales: { [key: string]: { product: Product; quantity: number; revenue: number } } = {};
      
      periodTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const productId = item.product.id;
          if (!productSales[productId]) {
            productSales[productId] = {
              product: item.product,
              quantity: 0,
              revenue: 0,
            };
          }
          productSales[productId].quantity += item.quantity;
          productSales[productId].revenue += item.subtotal;
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate sales by hour
      const hourlyData: { [key: number]: { sales: number; transactions: number } } = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = { sales: 0, transactions: 0 };
      }

      periodTransactions.forEach(transaction => {
        const hour = new Date(transaction.createdAt).getHours();
        hourlyData[hour].sales += transaction.total;
        hourlyData[hour].transactions += 1;
      });

      const salesByHour = Object.entries(hourlyData).map(([hour, data]) => ({
        hour: parseInt(hour),
        sales: data.sales,
        transactions: data.transactions,
      }));

      // Find peak hours
      const peakHours = salesByHour
        .sort((a, b) => b.transactions - a.transactions)
        .slice(0, 3);

      // Low stock products
      const lowStockProducts = products.filter(p => p.stock <= 10).length;

      setDashboardData({
        todaySales: totalSales,
        todayTransactions: periodTransactions.length,
        todayProfit: totalProfit,
        totalProducts: products.length,
        lowStockProducts,
        topProducts,
        peakHours,
        salesByHour,
      });
    } catch (error) {
      console.log('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSalesChartData = (): ChartData => {
    const labels = dashboardData.salesByHour
      .filter(item => item.sales > 0)
      .slice(0, 12)
      .map(item => `${item.hour}:00`);
    
    const data = dashboardData.salesByHour
      .filter(item => item.sales > 0)
      .slice(0, 12)
      .map(item => item.sales);

    return {
      labels,
      datasets: [{
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  const getTopProductsChartData = () => {
    if (dashboardData.topProducts.length === 0) {
      return [];
    }

    const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6'];
    
    return dashboardData.topProducts.map((item, index) => ({
      name: item.product.name.length > 15 
        ? item.product.name.substring(0, 15) + '...' 
        : item.product.name,
      population: item.revenue,
      color: colors[index % colors.length],
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color = colors.primary,
    subtitle 
  }: {
    title: string;
    value: string | number;
    icon: string;
    color?: string;
    subtitle?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <IconSymbol name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['today', 'week', 'month'] as const).map((period) => (
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
            {period === 'today' ? 'Hari Ini' : 
             period === 'week' ? 'Minggu Ini' : 'Bulan Ini'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Stack.Screen options={{ title: 'Dashboard' }} />
      
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Selamat datang, {user?.name}!
        </Text>
        <Text style={styles.roleText}>
          {isOwner ? 'Owner' : 'Kasir'}
        </Text>
      </View>

      <PeriodSelector />

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Penjualan"
          value={dashboardData.todaySales}
          icon="chart.line.uptrend.xyaxis"
          color={colors.primary}
        />
        <StatCard
          title="Transaksi"
          value={dashboardData.todayTransactions}
          icon="receipt"
          color={colors.accent}
        />
        <StatCard
          title="Keuntungan"
          value={dashboardData.todayProfit}
          icon="banknote"
          color={colors.secondary}
        />
        <StatCard
          title="Total Produk"
          value={dashboardData.totalProducts}
          icon="cube.box"
          color={colors.primary}
        />
      </View>

      {/* Low Stock Alert */}
      {dashboardData.lowStockProducts > 0 && (
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <IconSymbol name="exclamationmark.triangle" size={24} color="#FF9500" />
            <Text style={styles.alertTitle}>Peringatan Stok</Text>
          </View>
          <Text style={styles.alertText}>
            {dashboardData.lowStockProducts} produk memiliki stok rendah (≤10)
          </Text>
        </View>
      )}

      {/* Sales Chart */}
      {dashboardData.salesByHour.some(item => item.sales > 0) && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Penjualan per Jam</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={getSalesChartData()}
              width={Math.max(chartWidth, dashboardData.salesByHour.filter(item => item.sales > 0).length * 50)}
              height={220}
              chartConfig={{
                backgroundColor: colors.background,
                backgroundGradientFrom: colors.background,
                backgroundGradientTo: colors.background,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: colors.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          </ScrollView>
        </View>
      )}

      {/* Top Products Chart */}
      {dashboardData.topProducts.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Produk Terlaris</Text>
          <PieChart
            data={getTopProductsChartData()}
            width={chartWidth}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 10]}
            absolute
          />
        </View>
      )}

      {/* Peak Hours */}
      {dashboardData.peakHours.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Jam Tersibuk</Text>
          {dashboardData.peakHours.map((hour, index) => (
            <View key={hour.hour} style={styles.peakHourItem}>
              <Text style={styles.peakHourRank}>#{index + 1}</Text>
              <Text style={styles.peakHourTime}>{hour.hour}:00</Text>
              <Text style={styles.peakHourTransactions}>
                {hour.transactions} transaksi
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Top Products List */}
      {dashboardData.topProducts.length > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Produk Terlaris</Text>
          {dashboardData.topProducts.map((item, index) => (
            <View key={item.product.id} style={styles.topProductItem}>
              <Text style={styles.topProductRank}>#{index + 1}</Text>
              <View style={styles.topProductInfo}>
                <Text style={styles.topProductName}>{item.product.name}</Text>
                <Text style={styles.topProductStats}>
                  {item.quantity} terjual • {formatCurrency(item.revenue)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Aksi Cepat</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionButton}>
            <IconSymbol name="plus.circle" size={32} color={colors.primary} />
            <Text style={styles.quickActionText}>Tambah Produk</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <IconSymbol name="doc.text" size={32} color={colors.accent} />
            <Text style={styles.quickActionText}>Laporan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <IconSymbol name="person.2" size={32} color={colors.secondary} />
            <Text style={styles.quickActionText}>Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <IconSymbol name="gear" size={32} color={colors.grey} />
            <Text style={styles.quickActionText}>Pengaturan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.primary,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.background,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: colors.background + 'CC',
  },
  periodSelector: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedPeriodButton: {
    backgroundColor: colors.background,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.grey,
  },
  selectedPeriodButtonText: {
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTitle: {
    fontSize: 14,
    color: colors.grey,
    fontWeight: '500',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.grey,
  },
  alertCard: {
    backgroundColor: '#FF9500' + '10',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 8,
  },
  alertText: {
    fontSize: 14,
    color: colors.text,
  },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  peakHourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey + '20',
  },
  peakHourRank: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    width: 40,
  },
  peakHourTime: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  peakHourTransactions: {
    fontSize: 14,
    color: colors.grey,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey + '20',
  },
  topProductRank: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    width: 40,
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
  quickActions: {
    padding: 16,
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DashboardScreen;
