import { apiClient } from '@/lib/api/client';
import {
  ListModelsResponse,
  AIConfigurationSchema,
  CreateAIConfiguarationReqeust,
  UpdateAIConfiguarationReqeust,
} from '@insforge/shared-schemas';

export class AiService {
  getModels(): Promise<ListModelsResponse> {
    return apiClient.request('/ai/models', {
      headers: apiClient.withApiKey(),
    });
  }

  // AI Configuration endpoints
  async createConfiguration(
    data: CreateAIConfiguarationReqeust
  ): Promise<{ id: string; message: string }> {
    return apiClient.request('/ai/configurations', {
      method: 'POST',
      headers: apiClient.withApiKey(),
      body: JSON.stringify(data),
    });
  }

  async getConfigurations(): Promise<AIConfigurationSchema[]> {
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
    data: UpdateAIConfiguarationReqeust
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
}

export const aiService = new AiService();
