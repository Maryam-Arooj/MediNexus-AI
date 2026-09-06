import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser, AuthState } from '../types/auth';
import { authMe, getToken, setToken, clearToken } from '../api/client';

// ─── Context types ────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // start loading until we verify the stored token
  });

  // On mount: check if a valid token exists in localStorage
  const refresh = useCallback(async () => {
    const storedToken = getToken();
    if (!storedToken) {
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const user = await authMe();
      setState({ user, token: storedToken, isAuthenticated: true, isLoading: false });
    } catch {
      // Token invalid or expired
      clearToken();
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback((token: string, user: AuthUser) => {
    setToken(token);
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
