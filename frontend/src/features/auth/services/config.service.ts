import { apiClient } from '@/lib/api/client';

export interface OAuthProviderConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  enabled: boolean;
}

export interface OAuthConfig {
  google: OAuthProviderConfig;
  github: OAuthProviderConfig;
}

export interface OAuthStatus {
  google: { enabled: boolean };
  github: { enabled: boolean };
}

export class ConfigService {
  async getOAuthConfig(): Promise<OAuthConfig> {
    return apiClient.request('/auth/oauth/config');
  }

  //TODO: Why sending 2 requests at the same time? We should separate them into updateGoogleOAuthConfig and updateGithubOAuthConfig

  async updateOAuthConfig(config: OAuthConfig): Promise<{ message: string }> {
    // Update each provider separately as backend expects individual provider updates
    const promises = [];

    // Always update google config if clientId exists (even if empty to save enabled state)
    promises.push(
      apiClient.request('/auth/oauth/config', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google',
          clientId: config.google.clientId || '',
          clientSecret: config.google.clientSecret || '',
          enabled: config.google.enabled,
        }),
      })
    );

    // Always update github config if clientId exists (even if empty to save enabled state)
    promises.push(
      apiClient.request('/auth/oauth/config', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'github',
          clientId: config.github.clientId || '',
          clientSecret: config.github.clientSecret || '',
          enabled: config.github.enabled,
        }),
      })
    );

    await Promise.all(promises);
    return { message: 'OAuth configuration updated successfully' };
  }

  async getOAuthStatus(): Promise<OAuthStatus> {
    return apiClient.request('/config/oauth/status');
  }
}

export const configService = new ConfigService();
