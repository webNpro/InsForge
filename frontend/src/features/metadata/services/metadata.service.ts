import { apiClient } from '@/lib/api/client';
import {
  AppMetadataSchema,
  AuthConfigSchema,
  DatabaseSchema,
  StorageConfigSchema,
} from '@insforge/shared-schemas';

export class MetadataService {
  // Get full metadata (complete structured format)
  async getFullMetadata(): Promise<AppMetadataSchema> {
    return apiClient.request('/metadata', {
      headers: apiClient.withApiKey(),
    });
  }

  // Get database metadata only
  async getDatabaseMetadata(): Promise<DatabaseSchema> {
    const fullMetadata = await this.getFullMetadata();
    return fullMetadata.database;
  }

  // Get auth metadata only
  async getAuthMetadata(): Promise<AuthConfigSchema> {
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
