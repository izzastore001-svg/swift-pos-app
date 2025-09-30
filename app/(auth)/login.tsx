
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Button } from '@/components/button';
import { useAuth } from '../../hooks/useAuth';
import { commonStyles, colors } from '../../styles/commonStyles';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Masukkan nomor telepon');
      return;
    }

    setLoading(true);
    try {
      const success = await login(phone.trim());
      if (success) {
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert('Error', 'Nomor telepon tidak ditemukan atau tidak aktif');
      }
    } catch (error) {
      console.log('Login error:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userPhone: string) => {
    setPhone(userPhone);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ title: 'Login POS', headerShown: false }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🏪 POS System</Text>
          <Text style={styles.subtitle}>Masuk ke akun Anda</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nomor Telepon</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Masukkan nomor telepon"
            placeholderTextColor={colors.grey}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          <Button
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          >
            Masuk
          </Button>
        </View>

        <View style={styles.quickLogin}>
          <Text style={styles.quickLoginTitle}>Login Cepat:</Text>
          
          <Button
            variant="secondary"
            onPress={() => quickLogin('081234567890')}
            style={styles.quickButton}
          >
            👑 Owner (081234567890)
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => quickLogin('081234567891')}
            style={styles.quickButton}
          >
            💰 Kasir (081234567891)
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.grey,
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.grey + '30',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
  },
  quickLogin: {
    alignItems: 'center',
  },
  quickLoginTitle: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: 16,
  },
  quickButton: {
    marginBottom: 12,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.grey + '30',
  },
});
