import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '@/features/auth/services/auth.service';
import { apiClient } from '@/lib/api/client';

// Mock authService and apiClient
vi.mock('@/features/auth/services/auth.service', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
  },
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    clearToken: vi.fn(),
    setAuthErrorHandler: vi.fn(),
  },
}));

describe('AuthContext', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // We need to suppress console.error for this test since we expect an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth context when used within AuthProvider', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Authentication flow', () => {
    it('should check auth status on mount', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('should handle auth check failure', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(apiClient.clearToken).toHaveBeenCalled();
    });

    it('should login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      vi.mocked(authService.login).mockResolvedValue({ token: 'test-token', user: mockUser });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: boolean = false;
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'password');
      });

      expect(loginResult).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
    });

    it('should handle login failure', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: boolean = false;
      await act(async () => {
        loginResult = await result.current.login('test@example.com', 'wrong-password');
      });

      expect(loginResult).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error?.message).toBe('Invalid credentials');
    });

    it('should logout successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(apiClient.clearToken).toHaveBeenCalled();
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    });
  });

  describe('Auth error handler', () => {
    it('should set auth error handler on mount', () => {
      renderHook(() => useAuth(), { wrapper });

      expect(apiClient.setAuthErrorHandler).toHaveBeenCalled();
    });

    it('should clear auth error handler on unmount', () => {
      const { unmount } = renderHook(() => useAuth(), { wrapper });

      unmount();

      expect(apiClient.setAuthErrorHandler).toHaveBeenCalledWith(undefined);
    });
  });
});
