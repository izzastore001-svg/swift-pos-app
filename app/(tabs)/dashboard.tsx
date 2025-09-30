
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Storage } from '../../data/storage';
import { Transaction, Product } from '../../types';
import { commonStyles, colors } from '../../styles/commonStyles';

const { width } = Dimensions.get('window');

interface DashboardData {
  todaySales: number;
  todayTransactions: number;
  todayProfit: number;
  totalProducts: number;
  lowStockProducts: number;
}

export default function DashboardScreen() {
  const { user, isOwner } = useAuth();
  const [data, setData] = useState<DashboardData>({
    todaySales: 0,
    todayTransactions: 0,
    todayProfit: 0,
    totalProducts: 0,
    lowStockProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const transactions = await Storage.getTransactions();
      const products = await Storage.getProducts();
      
      // Get today's date
      const today = new Date().toDateString();
      const todayTransactions = transactions.filter(
        t => new Date(t.createdAt).toDateString() === today && t.status === 'completed'
      );

      const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
      const todayProfit = todayTransactions.reduce((sum, t) => {
        const profit = t.items.reduce((itemProfit, item) => {
          return itemProfit + ((item.product.price - item.product.cost) * item.quantity);
        }, 0);
        return sum + profit;
      }, 0);

      const lowStockProducts = products.filter(p => p.stock < 10).length;

      setData({
        todaySales,
        todayTransactions: todayTransactions.length,
        todayProfit,
        totalProducts: products.length,
        lowStockProducts,
      });
    } catch (error) {
      console.log('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const StatCard = ({ title, value, icon, color = colors.primary }: {
    title: string;
    value: string | number;
    icon: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboardData} />
      }
    >
      <Stack.Screen 
        options={{ 
          title: `Dashboard - ${user?.name}`,
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.text,
        }} 
      />

      <View style={styles.header}>
        <Text style={styles.greeting}>
          Selamat datang, {user?.name}! 👋
        </Text>
        <Text style={styles.role}>
          {isOwner ? '👑 Owner' : '💰 Kasir'}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Penjualan Hari Ini"
          value={formatCurrency(data.todaySales)}
          icon="💰"
          color={colors.primary}
        />
        
        <StatCard
          title="Transaksi Hari Ini"
          value={data.todayTransactions}
          icon="🧾"
          color="#34C759"
        />
        
        {isOwner && (
          <StatCard
            title="Keuntungan Hari Ini"
            value={formatCurrency(data.todayProfit)}
            icon="📈"
            color="#FF9500"
          />
        )}
        
        <StatCard
          title="Total Produk"
          value={data.totalProducts}
          icon="📦"
          color="#5856D6"
        />
        
        {data.lowStockProducts > 0 && (
          <StatCard
            title="Stok Menipis"
            value={data.lowStockProducts}
            icon="⚠️"
            color="#FF3B30"
          />
        )}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        
        <View style={styles.actionGrid}>
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>🛒</Text>
            <Text style={styles.actionTitle}>Transaksi Baru</Text>
            <Text style={styles.actionSubtitle}>Mulai transaksi kasir</Text>
          </View>
          
          <View style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionTitle}>Laporan</Text>
            <Text style={styles.actionSubtitle}>Lihat laporan penjualan</Text>
          </View>
          
          {isOwner && (
            <View style={styles.actionCard}>
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionTitle}>Tambah Produk</Text>
              <Text style={styles.actionSubtitle}>Kelola inventori</Text>
            </View>
          )}
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
  header: {
    padding: 20,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  role: {
    fontSize: 16,
    color: colors.grey,
    textAlign: 'center',
  },
  statsGrid: {
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
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  statTitle: {
    fontSize: 14,
    color: colors.grey,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  actionGrid: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: colors.grey,
    textAlign: 'center',
  },
});
