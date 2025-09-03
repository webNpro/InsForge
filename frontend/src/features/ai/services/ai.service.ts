import { apiClient } from '@/lib/api/client';
import { ListModelsResponse } from '@insforge/shared-schemas';

export class AiService {
  getModels(): Promise<ListModelsResponse> {
    return apiClient.request('/ai/models', {
      headers: apiClient.withApiKey(),
    });
  }
}

export const aiService = new AiService();