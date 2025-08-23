import { apiClient } from '@/lib/api/client';
import { OAuthConfigSchema } from '@insforge/shared-schemas';

export interface OAuthStatus {
  google: { enabled: boolean };
  github: { enabled: boolean };
}

export class ConfigService {
  async getOAuthConfig(): Promise<OAuthConfigSchema> {
    return apiClient.request('/config/oauth');
  }

  async updateOAuthConfig(config: OAuthConfigSchema): Promise<{ message: string }> {
    // Backend expects the full config object
    return apiClient.request('/config/oauth', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getOAuthStatus(): Promise<OAuthStatus> {
    return apiClient.request('/config/oauth/status');
  }

  async reloadOAuthConfig(): Promise<{
    message: string;
    config: { google: { enabled: boolean }; github: { enabled: boolean } };
  }> {
    return apiClient.request('/config/oauth/reload', {
      method: 'POST',
    });
  }
}

export const configService = new ConfigService();
