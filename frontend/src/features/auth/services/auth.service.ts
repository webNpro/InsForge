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
    const data = await apiClient.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Set token in apiClient
    if (data.data?.accessToken) {
      apiClient.setToken(data.data.accessToken);
    }

    // Return unified format
    return {
      accessToken: data.data?.accessToken,
      user: data.data?.user,
    };
  }

  async getCurrentUser() {
    const response = await apiClient.request('/auth/me');
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
    let url = '/auth/users';
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
    return await apiClient.request(`/auth/users/${id}`);
  }

  async register(email: string, password: string, name?: string) {
    const response = await apiClient.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    return response.data;
  }

  async deleteUsers(userIds: string[]) {
    return apiClient.request('/auth/users', {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
  }
}

export const authService = new AuthService();