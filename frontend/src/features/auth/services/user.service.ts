import { apiClient } from '@/lib/api/client';
import { UserSchema } from '@insforge/shared-schemas';

export class UserService {
  /**
   * Get users list
   * @param queryParams - Query parameters for pagination
   * @param searchQuery - Optional search query
   * @returns Users list with total count
   */
  async getUsers(
    queryParams: string = '',
    searchQuery?: string
  ): Promise<{
    users: UserSchema[];
    pagination: { offset: number; limit: number; total: number };
  }> {
    let url = '/auth/users';
    const params = new URLSearchParams(queryParams);

    if (searchQuery && searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response: {
      data: UserSchema[];
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

  async getCurrentUser() {
    const response = await apiClient.request('/auth/sessions/current');
    return response.user;
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
}

export const userService = new UserService();
