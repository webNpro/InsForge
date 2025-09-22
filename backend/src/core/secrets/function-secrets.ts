import { Pool } from 'pg';
import crypto from 'crypto';
import { DatabaseManager } from '@/core/database/manager.js';
import logger from '@/utils/logger.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { AuditService } from '@/core/logs/audit.js';

export interface FunctionSecretSchema {
  id: string;
  key: string;
  isReserved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FunctionSecretsService {
  private pool: Pool | null = null;
  private encryptionKey: Buffer;
  private auditService: AuditService;

  constructor() {
    // Reuse same encryption key as SecretsService
    const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!key) {
      throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set for secrets encryption');
    }
    this.encryptionKey = crypto.createHash('sha256').update(key).digest();
    this.auditService = AuditService.getInstance();
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = DatabaseManager.getInstance().getPool();
    }
    return this.pool;
  }

  /**
   * Encrypt a value using AES-256-GCM (same as SecretsService)
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a value using AES-256-GCM (same as SecretsService)
   */
  private decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Set or update a function secret
   */
  async setSecret(key: string, value: string, actor?: string, ipAddress?: string): Promise<{ success: boolean; message: string }> {
    // Validate input
    if (!key || !value) {
      throw new AppError('Both key and value are required', 400, ERROR_CODES.INVALID_INPUT);
    }

    // Validate key format (uppercase alphanumeric with underscores only)
    if (!/^[A-Z0-9_]+$/.test(key)) {
      throw new AppError(
        'Invalid key format. Use uppercase letters, numbers, and underscores only (e.g., STRIPE_API_KEY)',
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }

    const client = await this.getPool().connect();
    try {
      // Check if it's a reserved key
      const checkReserved = await client.query(
        'SELECT is_reserved FROM _function_secrets WHERE key = $1',
        [key]
      );
      
      if (checkReserved.rows[0]?.is_reserved) {
        throw new AppError(`Cannot modify reserved secret: ${key}`, 403, ERROR_CODES.FORBIDDEN);
      }

      const encryptedValue = this.encrypt(value);

      await client.query(
        `INSERT INTO _function_secrets (key, value_ciphertext)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE 
         SET value_ciphertext = $2`,
        [key, encryptedValue]
      );

      // Log audit
      await this.auditService.log({
        actor: actor || 'api-key',
        action: 'SET_FUNCTION_SECRET',
        module: 'FUNCTIONS',
        details: { key },
        ip_address: ipAddress,
      });

      logger.info('Function secret set', { key, actor });
      
      return {
        success: true,
        message: `Secret ${key} has been set successfully`
      };
    } catch (error) {
      logger.error('Failed to set function secret', { error, key });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all secrets decrypted for injection into edge functions
   */
  async getAllSecretsDecrypted(): Promise<Record<string, string>> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT key, value_ciphertext 
         FROM _function_secrets`
      );

      const secrets: Record<string, string> = {};
      for (const row of result.rows) {
        try {
          secrets[row.key] = this.decrypt(row.value_ciphertext);
        } catch (error) {
          logger.error(`Failed to decrypt function secret ${row.key}`, { error });
          // Skip this secret if decryption fails
        }
      }

      return secrets;
    } catch (error) {
      logger.error('Failed to get function secrets', { error });
      return {};
    } finally {
      client.release();
    }
  }

  /**
   * List secrets for UI (no values, just keys and metadata)
   */
  async listSecrets(): Promise<FunctionSecretSchema[]> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT 
          id,
          key,
          is_reserved as "isReserved",
          created_at as "createdAt",
          updated_at as "updatedAt"
         FROM _function_secrets
         ORDER BY is_reserved DESC, key ASC`
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list function secrets', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(key: string, actor?: string, ipAddress?: string): Promise<{ success: boolean; message: string }> {
    const client = await this.getPool().connect();
    try {
      // Check if reserved
      const checkReserved = await client.query(
        'SELECT is_reserved FROM _function_secrets WHERE key = $1',
        [key]
      );
      
      if (checkReserved.rows[0]?.is_reserved) {
        throw new AppError(`Cannot delete reserved secret: ${key}`, 403, ERROR_CODES.FORBIDDEN);
      }

      const result = await client.query(
        'DELETE FROM _function_secrets WHERE key = $1',
        [key]
      );

      const success = (result.rowCount ?? 0) > 0;
      
      if (success) {
        // Log audit
        await this.auditService.log({
          actor: actor || 'api-key',
          action: 'DELETE_FUNCTION_SECRET',
          module: 'FUNCTIONS',
          details: { key },
          ip_address: ipAddress,
        });
        
        logger.info('Function secret deleted', { key, actor });
        
        return {
          success: true,
          message: `Secret ${key} has been deleted`
        };
      } else {
        throw new AppError(`No secret found with key: ${key}`, 404, ERROR_CODES.NOT_FOUND);
      }
    } catch (error) {
      logger.error('Failed to delete function secret', { error, key });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Initialize reserved system secrets
   * These are automatically available to all edge functions
   */
  async initializeReservedSecrets(): Promise<void> {
    const client = await this.getPool().connect();
    try {
      // Get the API key from main secrets table
      const apiKeyResult = await client.query(
        `SELECT value_ciphertext FROM _secrets WHERE name = 'API_KEY'`
      );
      
      let apiKey = process.env.ACCESS_API_KEY || '';
      
      if (apiKeyResult.rows.length > 0) {
        try {
          apiKey = this.decrypt(apiKeyResult.rows[0].value_ciphertext);
        } catch (error) {
          logger.warn('Failed to decrypt API_KEY from _secrets table', { error });
        }
      }

      if (!apiKey) {
        logger.warn('No API_KEY available for function secrets');
      }

      // Reserved secrets that are always available in edge functions
      const reservedSecrets = [
        {
          key: 'INSFORGE_API_URL',
          value: 'http://insforge:7130'  // Internal Docker network URL
        },
        {
          key: 'INSFORGE_API_KEY',
          value: apiKey
        },
        {
          key: 'DENO_ENV',
          value: process.env.NODE_ENV || 'production'
        }
      ];

      for (const secret of reservedSecrets) {
        if (!secret.value) continue; // Skip if no value
        
        const encrypted = this.encrypt(secret.value);
        
        await client.query(
          `INSERT INTO _function_secrets (key, value_ciphertext, is_reserved)
           VALUES ($1, $2, true)
           ON CONFLICT (key) DO UPDATE 
           SET value_ciphertext = $2,
               is_reserved = true`,
          [secret.key, encrypted]
        );
      }

      logger.info('Reserved function secrets initialized');
    } catch (error) {
      logger.error('Failed to initialize reserved function secrets', { error });
    } finally {
      client.release();
    }
  }
}