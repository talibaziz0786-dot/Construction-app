import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiUrl } from '../services/apiBase.js';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Non-secret hint that this browser previously completed a sign-in.
 *
 * Guest usage is a first-class mode: calculators and estimates work without an
 * account. Without a hint there is nothing to restore, so the client skips the
 * `/api/auth/me` probe entirely — that removes the noisy 401 on every guest
 * page load while keeping cookie-based sessions working. The hint is not an
 * authorization signal: the server remains the only authority and every
 * protected response is still authenticated server-side.
 */
const SESSION_HINT_KEY = 'construction-app:session';

function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function setSessionHint(active: boolean): void {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* ignore */
  }
}

interface AuthErrorResponse {
  error: string;
}

async function fetchAuth<TSuccess>(endpoint: string, options?: RequestInit): Promise<{ data?: TSuccess | AuthErrorResponse; response: Response }> {
  const response = await fetch(apiUrl(endpoint), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (response.ok) {
    const data = await response.json();
    return { data: data as TSuccess, response };
  } else {
    try {
      const errorData = await response.json();
      return { response, data: errorData as AuthErrorResponse };
    } catch {
      return { response };
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    // Guest first: without a prior sign-in on this browser there is no session
    // to restore, so no request (and no 401) is produced.
    if (!hasSessionHint()) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { data, response } = await fetchAuth<{ user: User }>('/auth/me');
      if (response.status === 401) {
        // The stored session expired — expected, not an application error.
        setSessionHint(false);
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      } else if (response.ok) {
        // Type guard to ensure data is of type { user: User }
        const successData = data as { user: User };
        if (successData?.user) {
          setState({
            user: successData.user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setSessionHint(false);
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } else {
        // Data is AuthErrorResponse or undefined
        const errorResponse = data as AuthErrorResponse | undefined;
        throw new Error(errorResponse?.error || `Authentication failed with status ${response.status}`);
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { data, response } = await fetchAuth<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const successData = data as { user: User };
        if (successData?.user) {
          setSessionHint(true);
          setState({
            user: successData.user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          throw new Error(`Login failed: Invalid response data.`);
        }
      } else {
        const errorResponse = data as AuthErrorResponse | undefined;
        throw new Error(errorResponse?.error || `Login failed with status ${response.status}`);
      }
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false }));
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { data, response } = await fetchAuth<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      if (response.ok) {
        const successData = data as { user: User };
        if (successData?.user) {
          setSessionHint(true);
          setState({
            user: successData.user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          throw new Error(`Registration failed: Invalid response data.`);
        }
      } else {
        const errorResponse = data as AuthErrorResponse | undefined;
        throw new Error(errorResponse?.error || `Registration failed with status ${response.status}`);
      }
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchAuth('/auth/logout', { method: 'POST' });
    } finally {
      setSessionHint(false);
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}