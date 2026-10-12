import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthUser } from '../types/auth';
import { authLogout, authMe, clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from '../api/client';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  // On load: the stored token is only trusted after the server confirms it (and tells us the role).
  useEffect(() => {
    if (!getToken()) {
      setState({ user: null, isLoading: false });
      return;
    }
    authMe()
      .then((user) => setState({ user, isLoading: false }))
      .catch(() => {
        clearToken();
        setState({ user: null, isLoading: false });
      });
  }, []);

  // Any 401 from the API (expired / revoked session) logs the user out locally.
  useEffect(() => {
    const onUnauthorized = () => setState({ user: null, isLoading: false });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback((token: string, user: AuthUser) => {
    setToken(token);
    setState({ user, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      /* token already invalid or server unreachable — local logout still happens */
    }
    setState({ user: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, isAuthenticated: Boolean(state.user), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
