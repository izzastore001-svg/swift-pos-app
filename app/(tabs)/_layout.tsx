
import React from 'react';
import { Tabs } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';

export default function TabLayout() {
  const { user, isOwner } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.grey,
        tabBarStyle: {
          backgroundColor: colors.backgroundAlt,
          borderTopColor: colors.grey + '30',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: colors.backgroundAlt,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="chart.bar.fill" size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="cashier"
        options={{
          title: 'Kasir',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="creditcard.fill" size={24} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produk',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="cube.box.fill" size={24} color={color} />
          ),
          href: isOwner ? '/products' : null,
        }}
      />
      
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="doc.text.fill" size={24} color={color} />
          ),
          href: isOwner ? '/reports' : null,
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Pengaturan',
          tabBarIcon: ({ color }) => (
            <IconSymbol name="gearshape.fill" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
