import { Pool } from 'pg';
import { DatabaseManager } from '@/core/database/manager.js';
import logger from '@/utils/logger.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { EncryptionUtils } from './encryption.js';

export interface FunctionSecretSchema {
  id: string;
  key: string;
  isReserved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FunctionSecretsService {
  private pool: Pool | null = null;

  constructor() {
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = DatabaseManager.getInstance().getPool();
    }
    return this.pool;
  }


  /**
   * Set or update a function secret
   */
  async setSecret(key: string, value: string): Promise<{ success: boolean; message: string }> {
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

      const encryptedValue = EncryptionUtils.encrypt(value);

      await client.query(
        `INSERT INTO _function_secrets (key, value_ciphertext)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE 
         SET value_ciphertext = $2`,
        [key, encryptedValue]
      );

      logger.info('Function secret set', { key });
      
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
          secrets[row.key] = EncryptionUtils.decrypt(row.value_ciphertext);
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
  async deleteSecret(key: string): Promise<{ success: boolean; message: string }> {
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
        logger.info('Function secret deleted', { key });
        
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
      // Reserved secret that is always available in edge functions
      const reservedSecrets = [
        {
          key: 'INSFORGE_API_URL',
          value: 'http://insforge:7130'  // Internal Docker network URL
        }
      ];

      for (const secret of reservedSecrets) {
        if (!secret.value) continue; // Skip if no value
        
        const encrypted = EncryptionUtils.encrypt(secret.value);
        
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