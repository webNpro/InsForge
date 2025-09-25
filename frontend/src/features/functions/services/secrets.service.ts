import { apiClient } from '@/lib/api/client';

export interface Secret {
  id: string;
  key: string;
  isActive: boolean;
  isReserved: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSecretInput {
  key: string;
  value: string;
}

export interface SecretsListResponse {
  secrets: Secret[];
}

export interface SecretValueResponse {
  key: string;
  value: string;
}

export class SecretsService {
  async listSecrets(): Promise<Secret[]> {
    const data = (await apiClient.request('/secrets', {
      headers: apiClient.withAccessToken(),
    })) as SecretsListResponse;
    return data.secrets || [];
  }

  async getSecretValue(key: string): Promise<string | null> {
    try {
      const data = (await apiClient.request(`/secrets/${encodeURIComponent(key)}`, {
        headers: apiClient.withAccessToken(),
      })) as SecretValueResponse;
      return data.value;
    } catch (error) {
      // Return null if secret not found (404) or other errors
      return null;
    }
  }

  async createSecret(
    input: CreateSecretInput
  ): Promise<{ success: boolean; message: string; id?: string }> {
    return apiClient.request('/secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiClient.withAccessToken(),
      },
      body: JSON.stringify(input),
    });
  }

  async deleteSecret(key: string): Promise<{ success: boolean; message: string }> {
    return apiClient.request(`/secrets/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: apiClient.withAccessToken(),
    });
  }
}

export const secretsService = new SecretsService();
