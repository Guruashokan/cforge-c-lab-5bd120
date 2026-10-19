import { createContext, useContext, useState, useEffect, type FC, type ReactNode } from 'react';
import { api } from '../services/api';
import type { User, CatalystStatus, CatalystSyncResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  catalystStatus: CatalystStatus | null;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    target_company?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  syncCatalyst: () => Promise<CatalystSyncResponse>;
  refreshCatalystStatus: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('cforge_token') : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [catalystStatus, setCatalystStatus] = useState<CatalystStatus | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    async function initAuth() {
      try {
        setIsLoading(true);
        if (token) {
          const profile = await api.getMe();
          setUser(profile);
          localStorage.setItem('cforge_user', JSON.stringify(profile));
        } else {
          const cachedUser = localStorage.getItem('cforge_user');
          if (cachedUser) {
            try {
              setUser(JSON.parse(cachedUser));
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    async function initCatalyst() {
      try {
        const cat = await api.getCatalystStatus();
        setCatalystStatus(cat);
      } catch (err) {
        console.warn('Could not fetch Catalyst status:', err);
      }
    }

    initAuth();
    initCatalyst();
  }, [token]);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await api.login(usernameOrEmail, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('cforge_token', res.access_token);
    localStorage.setItem('cforge_user', JSON.stringify(res.user));
    setIsAuthModalOpen(false);
  };

  const register = async (userData: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
    target_company?: string;
  }) => {
    const res = await api.register(userData);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('cforge_token', res.access_token);
    localStorage.setItem('cforge_user', JSON.stringify(res.user));
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('cforge_token');
      localStorage.removeItem('cforge_user');
    }
  };

  const refreshCatalystStatus = async () => {
    try {
      const status = await api.getCatalystStatus();
      setCatalystStatus(status);
    } catch (err) {
      console.warn('Failed to refresh Catalyst status:', err);
    }
  };

  const syncCatalyst = async () => {
    const res = await api.syncCatalyst();
    await refreshCatalystStatus();
    return res;
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        catalystStatus,
        login,
        register,
        logout,
        syncCatalyst,
        refreshCatalystStatus,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
