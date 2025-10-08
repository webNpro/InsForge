import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { userService } from '@/features/auth/services/user.service';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  loginWithAuthorizationCode: (token: string) => Promise<boolean>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  error: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  const handleAuthError = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Set up auth error handler
  useEffect(() => {
    apiClient.setAuthErrorHandler(handleAuthError);
    return () => {
      apiClient.setAuthErrorHandler(undefined);
    };
  }, [handleAuthError]);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      if (err instanceof Error && !err.message.includes('401')) {
        setError(err);
      }
      apiClient.clearToken();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const invalidateAuthQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['apiKey'] }),
      queryClient.invalidateQueries({ queryKey: ['metadata'] }),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['tables'] }),
      queryClient.invalidateQueries({ queryKey: ['mcp-usage'] }),
    ]);
  }, [queryClient]);

  const loginWithPassword = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        setError(null);
        const data = await apiClient.request('/auth/admin/sessions', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        apiClient.setToken(data.accessToken);
        setUser(data.user);
        setIsAuthenticated(true);

        await invalidateAuthQueries();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Login failed'));
        return false;
      }
    },
    [invalidateAuthQueries]
  );

  const loginWithAuthorizationCode = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        setError(null);
        const data = await apiClient.request('/auth/admin/sessions/exchange', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });

        apiClient.setToken(data.accessToken);
        setUser(data.user);
        setIsAuthenticated(true);

        await invalidateAuthQueries();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Authorization code exchange failed'));
        return false;
      }
    },
    [invalidateAuthQueries]
  );

  const logout = useCallback(() => {
    apiClient.clearToken();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    await checkAuthStatus();
  }, [checkAuthStatus]);

  // Check auth status on mount
  useEffect(() => {
    void checkAuthStatus();
  }, [checkAuthStatus]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    loginWithPassword,
    loginWithAuthorizationCode,
    logout,
    refreshAuth,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
