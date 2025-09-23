import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import { isCloudEnvironment } from '@/utils/environment';

interface CloudCredentialsResponse {
  openrouter?: {
    api_key: string;
    limit?: number;
    expired_at?: string | null;
    usage?: number;
    limit_remaining?: number;
  };
}

interface CloudCredentials {
  apiKey: string;
  limitRemaining?: number;
  expiredAt?: Date | null;
}

interface OpenRouterKeyInfo {
  data: {
    label: string;
    usage: number;
    limit: number | null;
    is_free_tier: boolean;
  };
}

export class AIClientService {
  private static instance: AIClientService;
  private cloudCredentials: CloudCredentials | undefined;
  private openRouterClient: OpenAI | null = null;
  private currentApiKey: string | undefined;

  private constructor() {}

  static getInstance(): AIClientService {
    if (!AIClientService.instance) {
      AIClientService.instance = new AIClientService();
    }
    return AIClientService.instance;
  }

  /**
   * Create or recreate the OpenAI client with the given API key
   */
  private createClient(apiKey: string): OpenAI {
    this.currentApiKey = apiKey;
    return new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://insforge.dev',
        'X-Title': 'InsForge',
      },
    });
  }

  /**
   * Get OpenRouter API key based on environment
   * In cloud environment: fetches from cloud API with JWT authentication
   * In local environment: returns from environment variable
   */
  async getApiKey(): Promise<string> {
    if (isCloudEnvironment()) {
      if (
        this.cloudCredentials &&
        (!this.cloudCredentials.expiredAt || new Date() <= this.cloudCredentials.expiredAt)
      ) {
        return this.cloudCredentials.apiKey;
      } else {
        return await this.fetchCloudApiKey();
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not found in environment variables');
    }
    return apiKey;
  }

  /**
   * Get the OpenAI client, creating or updating it as needed
   * This is the main method services should use
   */
  async getClient(): Promise<OpenAI> {
    if (!this.openRouterClient) {
      this.openRouterClient = this.createClient(await this.getApiKey());
      return this.openRouterClient;
    }
    if (isCloudEnvironment()) {
      const apiKey = await this.getApiKey();
      if (this.currentApiKey !== apiKey) {
        this.openRouterClient = this.createClient(apiKey);
      }
    }
    return this.openRouterClient;
  }

  /**
   * Check if AI services are properly configured
   */
  isConfigured(): boolean {
    if (isCloudEnvironment()) {
      return true;
    }
    return !!process.env.OPENROUTER_API_KEY;
  }

  /**
   * Get remaining credits for the current API key from OpenRouter
   */
  async getRemainingCredits(): Promise<{
    usage: number;
    limit: number | null;
    remaining: number | null;
  }> {
    try {
      const apiKey = await this.getApiKey();

      const response = await fetch('https://openrouter.ai/api/v1/key', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch key info: ${response.statusText}`);
      }

      const keyInfo = (await response.json()) as OpenRouterKeyInfo;
      const cloudBoost = isCloudEnvironment() ? 10 : 1;

      return {
        usage: keyInfo.data.usage * cloudBoost,
        limit: keyInfo.data.limit !== null ? keyInfo.data.limit * cloudBoost : null,
        remaining:
          keyInfo.data.limit !== null
            ? (keyInfo.data.limit - keyInfo.data.usage) * cloudBoost
            : null,
      };
    } catch (error) {
      console.error('Failed to fetch remaining credits:', error);
      throw error;
    }
  }

  /**
   * Fetch API key from cloud service
   */
  private async fetchCloudApiKey(): Promise<string> {
    try {
      const projectId = process.env.PROJECT_ID;
      if (!projectId) {
        throw new Error('PROJECT_ID not found in environment variables');
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not found in environment variables');
      }

      // Sign a token for authentication
      const token = jwt.sign({ projectId }, jwtSecret, { expiresIn: '1h' });

      // Fetch API key from cloud service with sign token as query parameter
      const response = await fetch(
        `https://api.insforge.dev/ai/v1/credentials/${projectId}?sign=${token}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch cloud API key: ${response.statusText}`);
      }

      const data = (await response.json()) as CloudCredentialsResponse;

      // Extract API key from the openrouter object in response
      if (!data.openrouter?.api_key) {
        throw new Error('Invalid response: missing openrouter API Key');
      }

      // Store credentials with metadata
      this.cloudCredentials = {
        apiKey: data.openrouter.api_key,
        limitRemaining: data.openrouter.limit_remaining,
        expiredAt: data.openrouter.expired_at ? new Date(data.openrouter.expired_at) : null,
      };
      return data.openrouter.api_key;
    } catch (error) {
      console.error('Failed to fetch cloud API key:', error);
      throw error;
    }
  }
}
