import { InsForgeConfig } from './types';
import { HttpClient } from './lib/http-client';
import { TokenManager } from './lib/token-manager';
import { Auth } from './modules/auth';

/**
 * Main InsForge SDK Client
 * 
 * @example
 * ```typescript
 * import { InsForgeClient } from '@insforge/sdk';
 * 
 * const client = new InsForgeClient({
 *   baseUrl: 'http://localhost:7130'
 * });
 * 
 * // Register a new user
 * const session = await client.auth.register({
 *   email: 'user@example.com',
 *   password: 'password123',
 *   name: 'John Doe'
 * });
 * 
 * // Or login
 * const session = await client.auth.login({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * 
 * // Get current user
 * const user = await client.auth.getCurrentUser();
 * ```
 */
export class InsForgeClient {
  private http: HttpClient;
  private tokenManager: TokenManager;
  
  /**
   * Authentication module
   */
  public readonly auth: Auth;

  constructor(config: InsForgeConfig = {}) {
    // Initialize HTTP client
    this.http = new HttpClient(config);
    
    // Initialize token manager with storage
    this.tokenManager = new TokenManager(config.storage);
    
    // Initialize auth module
    this.auth = new Auth(
      this.http,
      this.tokenManager
    );
  }


  /**
   * Set a custom API key for authentication
   * This is useful for server-to-server communication
   * 
   * @param apiKey - The API key (should start with 'ik_')
   * 
   * @example
   * ```typescript
   * client.setApiKey('ik_your_api_key_here');
   * ```
   */
  setApiKey(apiKey: string): void {
    // API keys can be used as Bearer tokens
    this.http.setAuthToken(apiKey);
  }

  /**
   * Get the underlying HTTP client for custom requests
   * 
   * @example
   * ```typescript
   * const httpClient = client.getHttpClient();
   * const customData = await httpClient.get('/api/custom-endpoint');
   * ```
   */
  getHttpClient(): HttpClient {
    return this.http;
  }

  /**
   * Future modules will be added here:
   * - database: Database operations
   * - storage: File storage operations
   * - functions: Serverless functions
   * - tables: Table management
   * - metadata: Backend metadata
   */
}