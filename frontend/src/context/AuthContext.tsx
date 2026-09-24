import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { api, extractErrorMessage } from '../lib/api';
import { clearSession, getState, loadFromStorage, setSessionFromLogin, subscribe } from '../lib/session';
import type { AppUser, LoginResponse } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);

  useEffect(() => {
    loadFromStorage();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
      setSessionFromLogin(email, data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken } = getState();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // best effort: clear local session regardless
      }
    }
    clearSession();
  }, []);

  const value: AuthContextValue = {
    user: snapshot.user,
    isAuthenticated: Boolean(snapshot.user && snapshot.accessToken),
    isReady: true,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
