import { apiClient } from '@/lib/api/client';
import {
  ListModelsResponse,
  AIConfigurationSchema,
  AIConfigurationWithUsageSchema,
  CreateAIConfigurationReqeust,
  UpdateAIConfigurationReqeust,
  AIUsageSummary,
  AIUsageRecord,
  ListAIUsageResponse,
} from '@insforge/shared-schemas';

export class AiService {
  getModels(): Promise<ListModelsResponse> {
    return apiClient.request('/ai/models', {
      headers: apiClient.withApiKey(),
    });
  }

  // AI Configuration endpoints
  async createConfiguration(
    data: CreateAIConfigurationReqeust
  ): Promise<{ id: string; message: string }> {
    return apiClient.request('/ai/configurations', {
      method: 'POST',
      headers: apiClient.withApiKey(),
      body: JSON.stringify(data),
    });
  }

  async listConfigurations(): Promise<AIConfigurationWithUsageSchema[]> {
    return apiClient.request('/ai/configurations', {
      headers: apiClient.withApiKey(),
    });
  }

  async getConfiguration(id: string): Promise<AIConfigurationSchema> {
    return apiClient.request(`/ai/configurations/${id}`, {
      headers: apiClient.withApiKey(),
    });
  }

  async updateConfiguration(
    id: string,
    data: UpdateAIConfigurationReqeust
  ): Promise<{ message: string }> {
    return apiClient.request(`/ai/configurations/${id}`, {
      method: 'PATCH',
      headers: apiClient.withApiKey(),
      body: JSON.stringify(data),
    });
  }

  async deleteConfiguration(id: string): Promise<{ message: string }> {
    return apiClient.request(`/ai/configurations/${id}`, {
      method: 'DELETE',
      headers: apiClient.withApiKey(),
    });
  }

  // AI Usage endpoints
  async getUsageSummary(params?: {
    configId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AIUsageSummary> {
    const queryParams = new URLSearchParams();
    if (params?.configId) {
      queryParams.append('configId', params.configId);
    }
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate);
    }

    const queryString = queryParams.toString();
    const url = `/ai/usage/summary${queryString ? `?${queryString}` : ''}`;

    return apiClient.request(url, {
      headers: apiClient.withApiKey(),
    });
  }

  async getUsageRecords(params?: {
    startDate?: string;
    endDate?: string;
    limit?: string;
    offset?: string;
  }): Promise<ListAIUsageResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit);
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset);
    }

    const queryString = queryParams.toString();
    const url = `/ai/usage${queryString ? `?${queryString}` : ''}`;

    return apiClient.request(url, {
      headers: apiClient.withApiKey(),
    });
  }

  async getConfigUsageRecords(
    configId: string,
    params?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<AIUsageRecord[]> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate);
    }

    const queryString = queryParams.toString();
    const url = `/ai/usage/config/${configId}${queryString ? `?${queryString}` : ''}`;

    return apiClient.request(url, {
      headers: apiClient.withApiKey(),
    });
  }
}

export const aiService = new AiService();
