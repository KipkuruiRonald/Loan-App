'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { authApi, settingsApi, loansApi } from '@/lib/api';

export type UserRole = 'BORROWER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  credit_tier?: number;
  credit_score?: number;
  current_limit?: number;
  // Additional data fetched from database
  profile?: any;
  preferences?: any;
  loans?: any[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'okoleo_auth';
const REMEMBER_ME_DAYS = 30;
const DEFAULT_SESSION_HOURS = 8;

function getTokenExpiry(rememberMe: boolean): Date {
  const hours = rememberMe ? REMEMBER_ME_DAYS * 24 : DEFAULT_SESSION_HOURS;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function isTokenValid(expiry: Date | null): boolean {
  if (!expiry) return false;
  return new Date() < expiry;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
    error: null,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const { token, user, tokenExpiry } = JSON.parse(stored);
          
          if (token && isTokenValid(tokenExpiry ? new Date(tokenExpiry) : null)) {
            // Set token in axios header
            localStorage.setItem('access_token', token);
            
            // Try to fetch fresh user data
            try {
              const userData = await authApi.getCurrentUser();
              setState({
                isAuthenticated: true,
                user: userData,
                token,
                loading: false,
                error: null,
              });
            } catch {
              // Token exists but /me call failed - token might be expired
              // Clear invalid session
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem('access_token');
              setState({
                isAuthenticated: false,
                user: null,
                token: null,
                loading: false,
                error: null,
              });
            }
          } else {
            // Token expired or invalid
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('access_token');
            setState(prev => ({ ...prev, loading: false }));
          }
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initAuth();
  }, []);

  // Listen for storage changes (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !e.newValue) {
        // User logged out in another tab
        setState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
        });
        localStorage.removeItem('access_token');
      } else if (e.key === STORAGE_KEY && e.newValue) {
        // User logged in in another tab
        const { token, user } = JSON.parse(e.newValue);
        localStorage.setItem('access_token', token);
        setState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
          error: null,
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(async (identifier: string, password: string, rememberMe: boolean = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Clear any existing sessions before creating new one
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('access_token');
      sessionStorage.clear();

      // Use the identifier as username (backend expects username)
      const response = await authApi.login(identifier, password);
      const { access_token: token } = response;

      // Store token in axios
      localStorage.setItem('access_token', token);

      // Get user data
      const userData = await authApi.getCurrentUser();

      // Calculate token expiry
      const tokenExpiry = getTokenExpiry(rememberMe);

      // Store in localStorage
      const authData = {
        token,
        user: userData,
        tokenExpiry: tokenExpiry.toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));

      setState({
        isAuthenticated: true,
        user: userData,
        token,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  }, []);

  const logout = useCallback(async () => {
    // Call logout API (this will clear server-side session)
    try {
      await authApi.logout();
    } catch (error) {
      // Continue with local logout even if API fails
      console.error('Logout API error:', error);
    }
    
    // Clear all storage
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('access_token');
    
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;

    try {
      // Fetch all user data from database in parallel
      const [userData, profile, preferences, loans] = await Promise.all([
        authApi.getCurrentUser(),
        settingsApi.getProfile().catch(() => null),
        settingsApi.getPreferences().catch(() => null),
        loansApi.getAll().catch(() => [])
      ]);
      
      // Combine all user data
      const completeUserData = {
        ...userData,
        profile,
        preferences,
        loans
      };
      
      // Update localStorage with fresh user data
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { token, tokenExpiry } = JSON.parse(stored);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          token,
          user: completeUserData,
          tokenExpiry,
        }));
      }

      setState(prev => ({ ...prev, user: completeUserData }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // If refresh fails, logout user
      logout();
    }
  }, [state.token, logout]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser, clearError }}>
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

// Helper function to get redirect URL based on role
export function getRedirectPath(user: User | null): string {
  if (!user) return '/login';
  
  // Admin goes to admin dashboard
  if (user.role?.toUpperCase() === 'ADMIN') {
    return '/admin';
  }
  
  // Regular users go to their dashboard
  return '/dashboard';
}

// Helper to check if user is admin
export function isAdmin(user: User | null): boolean {
  return user?.role?.toUpperCase() === 'ADMIN';
}

// Helper to check if user is borrower
export function isBorrower(user: User | null): boolean {
  return user?.role?.toUpperCase() === 'BORROWER';
}
