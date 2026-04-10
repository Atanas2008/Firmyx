'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@/types';
import { logout as authLogout, markLoggedIn, clearTokens, isAuthenticated } from '@/lib/auth';
import { authApi } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    // Only probe /me if we believe we're logged in (indicator cookie present)
    if (!isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      // Cookie exists but /me failed — session expired, clean up
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      authLogout();
    };
    window.addEventListener('firmyx:auth-expired', handleExpired);
    return () => window.removeEventListener('firmyx:auth-expired', handleExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Login sets httpOnly cookies; response body is the User object
    const { data } = await authApi.login(email, password);
    markLoggedIn(); // Set indicator cookie for SSR middleware
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    // Call backend to blacklist token and clear cookies, then redirect
    authApi.logout().catch(() => {}).finally(() => authLogout());
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isLoggedIn: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

