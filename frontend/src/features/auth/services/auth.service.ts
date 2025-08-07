import { apiClient } from '@/lib/api/client';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

export class AuthService {
  async login(email: string, password: string) {
    const data = await apiClient.request('/auth/v2/admin/sign-in', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Set token in apiClient
    if (data.token) {
      apiClient.setToken(data.token);
    }

    // Return unified format
    return {
      accessToken: data.token,
      user: {
        ...data.user,
        createdAt: data.user.createdAt,
        updatedAt: data.user.updatedAt,
      },
    };
  }

  async getCurrentUser() {
    const response = await apiClient.request('/auth/v2/me');
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
  async getUsers(queryParams: string = '', searchQuery?: string) {
    let url = '/auth/v2/admin/users';
    const params = new URLSearchParams(queryParams);

    if (searchQuery && searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const data = await apiClient.request(url);

    return {
      records: data?.users || [],
      total: data?.total || 0,
    };
  }

  async getUser(id: string) {
    return await apiClient.request(`/auth/v2/admin/users/${id}`);
  }

  async register(email: string, password: string, name?: string, id?: string) {
    // Better Auth doesn't support custom IDs, so id parameter is ignored
    return apiClient.request('/auth/v2/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async deleteUsers(userIds: string[]) {
    return apiClient.request('/auth/v2/admin/users', {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
  }
}

export const authService = new AuthService();