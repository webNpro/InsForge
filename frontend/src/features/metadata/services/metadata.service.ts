import { apiClient } from '@/lib/api/client';

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  default_value?: string;
  primary_key?: boolean;
  foreign_key?: {
    table: string;
    column: string;
    on_delete?: string;
    on_update?: string;
  };
}

export interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  record_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseMetadata {
  tables: TableMetadata[];
}

export interface AuthMetadata {
  enabled: boolean;
  providers: string[];
  magicLink: boolean;
}

export interface StorageMetadata {
  buckets: Array<{
    name: string;
    public: boolean;
    created_at?: string;
  }>;
}

export interface FullAppMetadata {
  database: DatabaseMetadata;
  auth: AuthMetadata;
  storage: StorageMetadata;
  version?: string;
}

export class MetadataService {
  // Get full metadata (complete structured format)
  async getFullMetadata(): Promise<FullAppMetadata> {
    return apiClient.request('/metadata', {
      headers: apiClient.withApiKey(),
    });
  }

  // Get database metadata only
  async getDatabaseMetadata(): Promise<DatabaseMetadata> {
    const fullMetadata = await this.getFullMetadata();
    return fullMetadata.database;
  }

  // Get auth metadata only
  async getAuthMetadata(): Promise<AuthMetadata> {
    const fullMetadata = await this.getFullMetadata();
    return fullMetadata.auth;
  }

  // Get storage metadata only
  async getStorageMetadata(): Promise<StorageMetadata> {
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
