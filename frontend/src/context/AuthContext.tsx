import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing auth on app start
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      // Clear any existing auth data to force login screen
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      console.log('🧹 Cleared stored auth data to show login screen');
      
      // Don't set any user data - this will show the login screen
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error checking existing auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginDemoUser = async () => {
    try {
      const response = await apiService.demoLogin('demo@example.com', 'DemoUser');
      if (response.success && response.data) {
        const { user: userData, token: authToken } = response.data;

        await AsyncStorage.setItem(TOKEN_KEY, authToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));

        setToken(authToken);
        setUser(userData);
      }
    } catch (error) {
      console.error('Demo login failed:', error);
      // Set fallback demo user
      const demoUser = {
        id: 'demo-user',
        email: 'demo@example.com',
        username: 'DemoUser',
        createdAt: new Date().toISOString()
      };
      setUser(demoUser);
      setToken('demo-token');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      // Use demo login instead of regular login
      const response = await apiService.demoLogin(email, 'DemoUser');

      if (response.success && response.data) {
        const { user: userData, token: authToken } = response.data;

        // Store auth data
        await AsyncStorage.setItem(TOKEN_KEY, authToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        await AsyncStorage.setItem('user_id', userData.id);

        setToken(authToken);
        setUser(userData);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      const response = await apiService.register(email, password, username);

      if (response.success && response.data) {
        const { user: userData, token: authToken } = response.data;

        // Store auth data
        await AsyncStorage.setItem(TOKEN_KEY, authToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        await AsyncStorage.setItem('user_id', userData.id);

        setToken(authToken);
        setUser(userData);
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await clearAuthData();
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const clearAuthData = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem('user_id');
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}