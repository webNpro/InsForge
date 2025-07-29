import { apiClient } from '@/lib/api/client';

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  async login(email: string, password: string) {
    const data = await apiClient.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.access_token) {
      apiClient.setToken(data.access_token);
    }

    return data;
  }

  async getCurrentUser() {
    return apiClient.request('/auth/me');
  }

  async logout() {
    apiClient.clearToken();
  }

  // User management
  async getUsers(queryParams: string = '', searchQuery?: string) {
    // Users are managed through the auth API, not tables
    let url = '/auth/users';
    const params = new URLSearchParams(queryParams);

    if (searchQuery && searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const data = await apiClient.request(url);
    // Adapt to backend pagination return structure
    return {
      records: data?.users || [],
      total: data?.total || 0,
    };
  }

  async getUser(id: string) {
    // Individual user fetching not supported by backend
    // Would need to fetch all users and filter
    const allUsers = await this.getUsers();
    const user = allUsers.records.find((u: any) => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async register(email: string, password: string, name?: string, id?: string) {
    return apiClient.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, id }),
    });
  }

  async bulkDeleteUsers(userIds: string[]) {
    return apiClient.request('/auth/users/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
  }

  // These operations are not implemented in the backend yet
  // The backend would need to add:
  // - PATCH /api/auth/users/:id for updating user email
  // - DELETE /api/auth/users/:id for deleting users
  // Profile updates go through /api/profile/me or /api/profile/:id
}

export const authService = new AuthService();
