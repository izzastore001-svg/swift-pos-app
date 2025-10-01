
import { useState, useEffect } from 'react';
import { User } from '../types';
import { Storage } from '../data/storage';
import { sampleUsers } from '../data/sampleData';
import { supabase } from '../config/supabase';
import { Alert } from 'react-native';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    initializeAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      // Initialize sample users if not exists
      const existingUsers = await Storage.getUsers();
      if (existingUsers.length === 0) {
        await Storage.saveUsers(sampleUsers);
      }

      // Check for current session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        // Fallback to local storage for offline mode
        const currentUser = await Storage.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.log('Error initializing auth:', error);
      // Fallback to local storage
      const currentUser = await Storage.getCurrentUser();
      setUser(currentUser);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.log('Error loading user profile:', error);
        return;
      }

      if (profile) {
        const userProfile: User = {
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          role: profile.role,
          isActive: profile.is_active,
          storeId: profile.store_id,
          createdAt: profile.created_at,
        };
        
        setUser(userProfile);
        await Storage.setCurrentUser(userProfile);
      }
    } catch (error) {
      console.log('Error loading user profile:', error);
    }
  };

  const loginWithPhone = async (phone: string): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true);
      
      // First try local authentication for offline mode
      const users = await Storage.getUsers();
      const foundUser = users.find(u => u.phone === phone && u.isActive);
      
      if (foundUser) {
        await Storage.setCurrentUser(foundUser);
        setUser(foundUser);
        return { success: true, message: 'Login berhasil' };
      }

      // If online, try to authenticate with Supabase
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('phone', phone)
          .eq('is_active', true)
          .single();

        if (error || !profile) {
          return { success: false, message: 'Nomor telepon tidak ditemukan atau tidak aktif' };
        }

        const userProfile: User = {
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          role: profile.role,
          isActive: profile.is_active,
          storeId: profile.store_id,
          createdAt: profile.created_at,
        };
        
        setUser(userProfile);
        await Storage.setCurrentUser(userProfile);
        return { success: true, message: 'Login berhasil' };
      } catch (supabaseError) {
        console.log('Supabase login error:', supabaseError);
        return { success: false, message: 'Gagal terhubung ke server. Coba lagi nanti.' };
      }
    } catch (error) {
      console.log('Error logging in:', error);
      return { success: false, message: 'Terjadi kesalahan saat login' };
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
        return { success: true, message: 'Login berhasil' };
      }

      return { success: false, message: 'Login gagal' };
    } catch (error) {
      console.log('Error logging in with email:', error);
      return { success: false, message: 'Terjadi kesalahan saat login' };
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string, phone: string, role: 'owner' | 'cashier'): Promise<{ success: boolean; message: string }> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://natively.dev/email-confirmed'
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            name,
            phone,
            role,
            is_active: true,
          });

        if (profileError) {
          console.log('Error creating user profile:', profileError);
          return { success: false, message: 'Gagal membuat profil pengguna' };
        }

        Alert.alert(
          'Registrasi Berhasil',
          'Silakan periksa email Anda untuk verifikasi akun sebelum login.',
          [{ text: 'OK' }]
        );

        return { success: true, message: 'Registrasi berhasil. Silakan verifikasi email Anda.' };
      }

      return { success: false, message: 'Registrasi gagal' };
    } catch (error) {
      console.log('Error registering:', error);
      return { success: false, message: 'Terjadi kesalahan saat registrasi' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local storage
      await Storage.setCurrentUser(null);
      setUser(null);
      setSession(null);
    } catch (error) {
      console.log('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    try {
      if (!user) return false;

      // Update local storage
      const updatedUser = { ...user, ...updates };
      await Storage.setCurrentUser(updatedUser);
      setUser(updatedUser);

      // Update in Supabase if online
      if (session?.user) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            name: updates.name,
            phone: updates.phone,
            is_active: updates.isActive,
          })
          .eq('user_id', session.user.id);

        if (error) {
          console.log('Error updating profile in Supabase:', error);
          // Don't return false here, local update was successful
        }
      }

      return true;
    } catch (error) {
      console.log('Error updating profile:', error);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://natively.dev/reset-password',
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Email reset password telah dikirim' };
    } catch (error) {
      console.log('Error resetting password:', error);
      return { success: false, message: 'Terjadi kesalahan saat reset password' };
    }
  };

  return {
    user,
    session,
    loading,
    loginWithPhone,
    loginWithEmail,
    registerWithEmail,
    logout,
    updateProfile,
    resetPassword,
    isOwner: user?.role === 'owner',
    isCashier: user?.role === 'cashier',
    isAuthenticated: !!user,
  };
};
