import { apiClient } from '@/lib/api/client';
import {
  AppMetadataSchema,
  OAuthMetadataSchema,
  StorageMetadataSchema,
  DashboardMetadataSchema,
  DatabaseMetadataSchema,
} from '@insforge/shared-schemas';

export class MetadataService {
  async fetchApiKey() {
    const data = await apiClient.request('/metadata/api-key');
    return data.apiKey;
  }
  // Get full metadata (complete structured format)
  async getFullMetadata(): Promise<AppMetadataSchema> {
    return apiClient.request('/metadata', {
      headers: apiClient.withAccessToken(),
    });
  }

  // Get dashboard metadata only
  async getDashboardMetadata(): Promise<DashboardMetadataSchema> {
    return apiClient.request('/metadata/dashboard', {
      headers: apiClient.withAccessToken(),
    });
  }

  // Get auth metadata only
  async getAuthMetadata(): Promise<OAuthMetadataSchema> {
    const fullMetadata = await this.getFullMetadata();
    return fullMetadata.auth;
  }

  // Get database metadata only
  async getDatabaseMetadata(): Promise<DatabaseMetadataSchema> {
    const fullMetadata = await this.getFullMetadata();
    return fullMetadata.database;
  }

  // Get storage metadata only
  async getStorageMetadata(): Promise<StorageMetadataSchema> {
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
