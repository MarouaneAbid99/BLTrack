import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'BLTRACK_MOBILE_TOKEN';
let tokenChangeHandler: ((token: string | null) => void) | null = null;

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const setTokenChangeHandler = (handler: (token: string | null) => void) => {
  tokenChangeHandler = handler;
};

const getStoredToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(TOKEN_KEY);
  }

  return SecureStore.getItemAsync(TOKEN_KEY);
};

const setStoredToken = async (token: string): Promise<void> => {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

const removeStoredToken = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

export const getToken = async (): Promise<string | null> => getStoredToken();

export const saveToken = async (token: string): Promise<void> => {
  await setStoredToken(token);
  tokenChangeHandler?.(token);
};

export const deleteToken = async (): Promise<void> => {
  await removeStoredToken();
  tokenChangeHandler?.(null);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const savedToken = await getToken();
      setToken(savedToken);
      setLoading(false);
    };
    restore();
    setTokenChangeHandler(setToken);
  }, []);

  const login = async (tokenValue: string, authUser: AuthUser) => {
    await saveToken(tokenValue);
    setUser(authUser);
    setToken(tokenValue);
  };

  const logout = async () => {
    await deleteToken();
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({ token, user, loading, login, logout }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
