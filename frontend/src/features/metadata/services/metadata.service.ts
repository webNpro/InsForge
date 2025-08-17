import { apiClient } from '@/lib/api/client';
import {
  AppMetadataSchema,
  OAuthConfigSchema,
  StorageConfigSchema,
  DatabaseMetadataSchema,
} from '@insforge/shared-schemas';

export class MetadataService {
  async fetchApiKey() {
    const data = await apiClient.request('/metadata/api-key');
    // data is already unwrapped by request method
    if (data.apiKey) {
      apiClient.setApiKey(data.apiKey);
    }
    return data.apiKey;
  }
  // Get full metadata (complete structured format)
  async getFullMetadata(): Promise<AppMetadataSchema> {
    return apiClient.request('/metadata', {
      headers: apiClient.withApiKey(),
    });
  }

  // Get database metadata only
  async getDatabaseMetadata(): Promise<DatabaseMetadataSchema> {
    return apiClient.request('/metadata/database', {
      headers: apiClient.withApiKey(),
    });
  }

  // Get auth metadata only
  async getAuthMetadata(): Promise<OAuthConfigSchema> {
    const fullMetadata = await this.getFullMetadata();
    return fullMetadata.auth;
  }

  // Get storage metadata only
  async getStorageMetadata(): Promise<StorageConfigSchema> {
    const fullMetadata = await this.getFullMetadata();
    return fullMetadata.storage;
  }

  // Get system version
  async getSystemVersion(): Promise<string> {
    const fullMetadata = await this.getFullMetadata();
    return fullMetadata.version || 'Unknown';
  }
}

export const metadataService = new MetadataService();
