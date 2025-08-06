import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { DatabaseManager } from '@/core/database/database.js';
import logger from '@/utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Minimal auth service for Better Auth integration
 * Most auth operations are handled by Better Auth at /api/auth/v2/*
 * This service only handles:
 * - JWT token generation/verification (for PostgREST compatibility)
 * - Better Auth session token verification
 * - API key management
 */
export class AuthService {
  private static instance: AuthService;
  private betterAuthJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Generate JWT token (mainly for admin and PostgREST compatibility)
   * PostgREST requires HS256 tokens, while Better Auth uses EdDSA
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * Verify JWT token (for admin tokens)
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role || 'authenticated',
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Verify Better Auth session token by exchanging it for a JWT
   * Better Auth uses EdDSA signing, so we need to verify with JWKS
   */
  async verifyBetterAuthUserSessionToken(sessionToken: string): Promise<TokenPayload> {
    try {
      const baseURL = process.env.API_BASE_URL || 'http://localhost:7130';
      
      // 1. Exchange session token for JWT using Better Auth's /token endpoint
      const tokenResponse = await axios.get('/api/auth/v2/token', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        baseURL,
        timeout: 5000,
      });

      if (!tokenResponse.data || !tokenResponse.data.token) {
        throw new Error('Invalid response from Better Auth /token endpoint');
      }

      const jwtToken = tokenResponse.data.token;

      // 2. Get JWKS for verification (cached)
      if (!this.betterAuthJWKS) {
        const jwksUrl = new URL(`${baseURL}/api/auth/v2/jwks`);
        this.betterAuthJWKS = createRemoteJWKSet(jwksUrl);
      }

      // 3. Verify JWT signature (supports EdDSA)
      const { payload } = await jwtVerify(jwtToken, this.betterAuthJWKS);

      // 4. Convert to TokenPayload format
      return {
        sub: payload.sub as string,
        email: payload.email as string,
        role: (payload.role as string) || 'authenticated',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.debug('Better Auth session verification failed', {
          status: error.response?.status,
          message: error.response?.data?.message,
        });
      }
      throw new Error('Invalid session token');
    }
  }

  /**
   * Generate a new API key
   */
  generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify API key against stored key
   */
  async verifyApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    const dbManager = DatabaseManager.getInstance();
    const storedApiKey = await dbManager.getApiKey();
    return storedApiKey === apiKey;
  }

  /**
   * Initialize API key on startup
   */
  async initializeApiKey(): Promise<string> {
    const dbManager = DatabaseManager.getInstance();
    let apiKey = await dbManager.getApiKey();

    if (!apiKey) {
      apiKey = this.generateApiKey();
      await dbManager.setApiKey(apiKey);
      logger.info('✅ API key generated');
    } else {
      logger.info('✅ API key exists');
    }

    return apiKey;
  }
}