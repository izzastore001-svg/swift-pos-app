
import { useState, useEffect } from 'react';
import { User } from '../types';
import { Storage } from '../data/storage';
import { sampleUsers } from '../data/sampleData';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Initialize sample users if not exists
      const existingUsers = await Storage.getUsers();
      if (existingUsers.length === 0) {
        await Storage.saveUsers(sampleUsers);
      }

      // Check for current user
      const currentUser = await Storage.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.log('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string): Promise<boolean> => {
    try {
      const users = await Storage.getUsers();
      const foundUser = users.find(u => u.phone === phone && u.isActive);
      
      if (foundUser) {
        await Storage.setCurrentUser(foundUser);
        setUser(foundUser);
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error logging in:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await Storage.setCurrentUser(null);
      setUser(null);
    } catch (error) {
      console.log('Error logging out:', error);
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isOwner: user?.role === 'owner',
    isCashier: user?.role === 'cashier',
  };
};
