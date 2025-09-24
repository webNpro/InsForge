import { apiClient } from '@/lib/api/client';

export interface FunctionSecret {
  id: string;
  key: string;
  isReserved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSecretInput {
  key: string;
  value: string;
}

export interface SecretsListResponse {
  secrets: FunctionSecret[];
}

export class FunctionSecretsService {
  async listSecrets(): Promise<FunctionSecret[]> {
    const data = (await apiClient.request('/function-secrets', {
      headers: apiClient.withAccessToken(),
    })) as SecretsListResponse;
    return data.secrets || [];
  }

  async createOrUpdateSecret(
    input: CreateSecretInput
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.request('/function-secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...apiClient.withAccessToken(),
      },
      body: JSON.stringify(input),
    });
  }

  async deleteSecret(key: string): Promise<{ success: boolean; message: string }> {
    return apiClient.request(`/function-secrets/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: apiClient.withAccessToken(),
    });
  }
}

export const functionSecretsService = new FunctionSecretsService();
