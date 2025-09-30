
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Button } from '@/components/button';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../styles/commonStyles';

export default function SettingsScreen() {
  const { user, logout, isOwner } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar dari aplikasi?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingItemLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingItemText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showArrow && onPress && (
        <Text style={styles.settingArrow}>›</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Pengaturan',
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.text,
        }} 
      />

      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userIcon}>
            {isOwner ? '👑' : '💰'}
          </Text>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userRole}>
              {isOwner ? 'Owner' : 'Kasir'} • {user?.phone}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Akun</Text>
        
        <SettingItem
          icon="👤"
          title="Profil Pengguna"
          subtitle="Kelola informasi akun Anda"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
        
        {isOwner && (
          <SettingItem
            icon="👥"
            title="Manajemen Karyawan"
            subtitle="Kelola akun karyawan"
            onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
          />
        )}
        
        <SettingItem
          icon="🔒"
          title="Keamanan"
          subtitle="Ubah password dan pengaturan keamanan"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Toko</Text>
        
        {isOwner && (
          <>
            <SettingItem
              icon="🏪"
              title="Informasi Toko"
              subtitle="Nama, alamat, dan kontak toko"
              onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
            />
            
            <SettingItem
              icon="🏢"
              title="Multi-Store"
              subtitle="Kelola beberapa cabang toko"
              onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
            />
          </>
        )}
        
        <SettingItem
          icon="🖨️"
          title="Printer & Scanner"
          subtitle="Pengaturan perangkat thermal printer"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
        
        <SettingItem
          icon="💳"
          title="Metode Pembayaran"
          subtitle="QRIS, kartu, dan pembayaran digital"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Sinkronisasi</Text>
        
        <SettingItem
          icon="☁️"
          title="Backup Cloud"
          subtitle="Sinkronisasi otomatis ke cloud"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
        
        <SettingItem
          icon="📱"
          title="Mode Offline"
          subtitle="Pengaturan untuk bekerja tanpa internet"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
        
        <SettingItem
          icon="📊"
          title="Export Data"
          subtitle="Export laporan ke PDF/Excel"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
      </View>

      {isOwner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promosi & Diskon</Text>
          
          <SettingItem
            icon="🎯"
            title="Kelola Diskon"
            subtitle="Buat dan atur promosi"
            onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
          />
          
          <SettingItem
            icon="👥"
            title="Program Member"
            subtitle="Pengaturan poin dan reward"
            onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bantuan & Dukungan</Text>
        
        <SettingItem
          icon="❓"
          title="Bantuan"
          subtitle="FAQ dan panduan penggunaan"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
        
        <SettingItem
          icon="📞"
          title="Hubungi Support"
          subtitle="Dapatkan bantuan teknis"
          onPress={() => Alert.alert('Info', 'Fitur ini akan segera tersedia')}
        />
        
        <SettingItem
          icon="ℹ️"
          title="Tentang Aplikasi"
          subtitle="Versi 1.0.0"
          onPress={() => Alert.alert('POS System', 'Versi 1.0.0\n\nAplikasi Point of Sale untuk bisnis retail dengan fitur offline-first dan sinkronisasi cloud.')}
          showArrow={false}
        />
      </View>

      <View style={styles.logoutSection}>
        <Button
          onPress={handleLogout}
          variant="secondary"
          style={styles.logoutButton}
        >
          🚪 Keluar dari Akun
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 POS System. All rights reserved.
        </Text>
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
    backgroundColor: colors.backgroundAlt,
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: colors.grey,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey + '20',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  settingItemText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.grey,
  },
  settingArrow: {
    fontSize: 20,
    color: colors.grey,
    marginLeft: 12,
  },
  logoutSection: {
    padding: 20,
    marginTop: 24,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.grey,
    textAlign: 'center',
  },
});
