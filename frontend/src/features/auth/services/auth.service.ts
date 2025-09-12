import { apiClient } from '@/lib/api/client';
import type { User } from '@/features/auth/types';

export class AuthService {
  async loginWithPassword(email: string, password: string) {
    const data = await apiClient.request('/auth/admin/sessions', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Set token in apiClient
    if (data.accessToken) {
      apiClient.setToken(data.accessToken);
    }

    // Return unified format
    return {
      accessToken: data.accessToken,
      user: data.user,
    };
  }

  async loginWithAuthorizationCode(code: string) {
    const data = await apiClient.request('/auth/admin/sessions/exchange', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });

    // Set token in apiClient
    if (data.accessToken) {
      apiClient.setToken(data.accessToken);
    }

    // Return unified format
    return {
      accessToken: data.accessToken,
      user: data.user,
    };
  }

  async getCurrentUser() {
    const response = await apiClient.request('/auth/sessions/current');
    return response.user;
  }

  logout() {
    apiClient.clearToken();
  }

  /**
   * Get users list
   * @param queryParams - Query parameters for pagination
   * @param searchQuery - Optional search query
   * @returns Users list with total count
   */
  async getUsers(
    queryParams: string = '',
    searchQuery?: string
  ): Promise<{ users: User[]; pagination: { offset: number; limit: number; total: number } }> {
    let url = '/auth/users';
    const params = new URLSearchParams(queryParams);

    if (searchQuery && searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response: {
      data: User[];
      pagination: { offset: number; limit: number; total: number };
    } = await apiClient.request(url);

    return {
      users: response.data,
      pagination: response.pagination,
    };
  }

  async getUser(id: string) {
    return await apiClient.request(`/auth/users/${id}`);
  }

  async register(email: string, password: string, name?: string) {
    const response = await apiClient.request('/auth/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    return response;
  }

  async deleteUsers(userIds: string[]) {
    return apiClient.request('/auth/users', {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
  }

  async generateAnonToken(): Promise<{ accessToken: string; message: string }> {
    return apiClient.request('/auth/tokens/anon', {
      method: 'POST',
    });
  }
}

export const authService = new AuthService();
