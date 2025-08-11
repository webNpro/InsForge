import { DatabaseManager } from '@/core/database/database.js';
import logger from '@/utils/logger.js';
import type { OAuthConfig } from '@/types/auth.js';

/**
 * Reload OAuth configuration from database
 * Updates environment variables so AuthService can use them
 */
export async function reloadAuth(): Promise<{ config: OAuthConfig }> {
  const db = DatabaseManager.getInstance();
  
  // Load OAuth configuration from database
  const configRows = await db.getDb().prepare(`
    SELECT key, value FROM _config WHERE key LIKE 'oauth_%'
  `).all();

  // Parse configuration
  const config: OAuthConfig = {
    google: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:7130/api/auth/oauth/google/callback'
    },
    github: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:7130/api/auth/oauth/github/callback'
    }
  };

  // Process config rows
  for (const row of configRows) {
    const [, provider, field] = row.key.split('_'); // oauth_google_clientId
    
    if (provider === 'google') {
      if (field === 'enabled') {
        config.google.enabled = row.value === 'true';
      } else if (field === 'clientId') {
        config.google.clientId = row.value;
      } else if (field === 'clientSecret') {
        config.google.clientSecret = row.value;
      } else if (field === 'redirectUri' && row.value) {
        config.google.redirectUri = row.value;
      }
    } else if (provider === 'github') {
      if (field === 'enabled') {
        config.github.enabled = row.value === 'true';
      } else if (field === 'clientId') {
        config.github.clientId = row.value;
      } else if (field === 'clientSecret') {
        config.github.clientSecret = row.value;
      } else if (field === 'redirectUri' && row.value) {
        config.github.redirectUri = row.value;
      }
    }
  }

  // Update environment variables so AuthService can use them
  // AuthService reads these on initialization
  if (config.google.clientId) {
    process.env.GOOGLE_CLIENT_ID = config.google.clientId;
  }
  if (config.google.clientSecret) {
    process.env.GOOGLE_CLIENT_SECRET = config.google.clientSecret;
  }
  if (config.google.redirectUri) {
    process.env.GOOGLE_REDIRECT_URI = config.google.redirectUri;
  }

  if (config.github.clientId) {
    process.env.GITHUB_CLIENT_ID = config.github.clientId;
  }
  if (config.github.clientSecret) {
    process.env.GITHUB_CLIENT_SECRET = config.github.clientSecret;
  }
  if (config.github.redirectUri) {
    process.env.GITHUB_REDIRECT_URI = config.github.redirectUri;
  }

  logger.info('OAuth configuration reloaded', {
    google: {
      enabled: config.google.enabled,
      hasClientId: !!config.google.clientId,
      hasClientSecret: !!config.google.clientSecret
    },
    github: {
      enabled: config.github.enabled,
      hasClientId: !!config.github.clientId,
      hasClientSecret: !!config.github.clientSecret
    }
  });

  return { config };
}