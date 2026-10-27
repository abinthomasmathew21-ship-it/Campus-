import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api, setToken, getStoredToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
  checkSetupStatus: () => Promise<boolean>;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  setupAdmin: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);

  const checkSetupStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await api.checkSetupStatus();
      setNeedsSetup(res.needsSetup);
      return res.needsSetup;
    } catch {
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const setupRequired = await checkSetupStatus();
        if (setupRequired) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const token = getStoredToken();
        if (token) {
          const res = await api.getMe();
          if (isMounted && res.success) {
            setUser(res.user);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [checkSetupStatus]);

  const login = async (data: any) => {
    const res = await api.login(data);
    if (res.user) {
      setUser(res.user);
      setNeedsSetup(false);
    }
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (res.user) {
      setUser(res.user);
      setNeedsSetup(false);
    }
  };

  const setupAdmin = async (data: any) => {
    const res = await api.setupAdmin(data);
    if (res.user) {
      setUser(res.user);
      setNeedsSetup(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        needsSetup,
        checkSetupStatus,
        login,
        register,
        setupAdmin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
