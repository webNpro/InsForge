import { Pool } from 'pg';
import crypto from 'crypto';
import { DatabaseManager } from '@/core/database/manager.js';
import logger from '@/utils/logger.js';
import { EncryptionUtils } from './encryption.js';

export interface SecretSchema {
  id: string;
  name: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSecretInput {
  name: string;
  value: string;
  expiresAt?: Date;
}

export interface UpdateSecretInput {
  value?: string;
  isActive?: boolean;
  expiresAt?: Date | null;
}

export class SecretsService {
  private pool: Pool | null = null;

  constructor() {
    // Encryption is now handled by the shared EncryptionUtils
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = DatabaseManager.getInstance().getPool();
    }
    return this.pool;
  }


  /**
   * Create a new secret
   */
  async createSecret(input: CreateSecretInput): Promise<{ id: string }> {
    const client = await this.getPool().connect();
    try {
      const encryptedValue = EncryptionUtils.encrypt(input.value);

      const result = await client.query(
        `INSERT INTO _secrets (name, value_ciphertext, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [input.name, encryptedValue, input.expiresAt || null]
      );

      logger.info('Secret created', { id: result.rows[0].id, name: input.name });
      return { id: result.rows[0].id };
    } catch (error) {
      logger.error('Failed to create secret', { error, name: input.name });
      throw new Error('Failed to create secret');
    } finally {
      client.release();
    }
  }

  /**
   * Get a decrypted secret by ID
   */
  async getSecretById(id: string): Promise<string | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `UPDATE _secrets
         SET last_used_at = NOW()
         WHERE id = $1 AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         RETURNING value_ciphertext`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const decryptedValue = EncryptionUtils.decrypt(result.rows[0].value_ciphertext);
      logger.info('Secret retrieved', { id });
      return decryptedValue;
    } catch (error) {
      logger.error('Failed to get secret', { error, id });
      throw new Error('Failed to get secret');
    } finally {
      client.release();
    }
  }

  /**
   * Get a decrypted secret by name
   */
  async getSecretByName(name: string): Promise<string | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `UPDATE _secrets
         SET last_used_at = NOW()
         WHERE name = $1 AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         RETURNING value_ciphertext`,
        [name]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const decryptedValue = EncryptionUtils.decrypt(result.rows[0].value_ciphertext);
      logger.info('Secret retrieved by name', { name });
      return decryptedValue;
    } catch (error) {
      logger.error('Failed to get secret by name', { error, name });
      throw new Error('Failed to get secret');
    } finally {
      client.release();
    }
  }

  /**
   * List all secrets (without decrypting values)
   */
  async listSecrets(): Promise<SecretSchema[]> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT
          id,
          name,
          is_active as "isActive",
          last_used_at as "lastUsedAt",
          expires_at as "expiresAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
         FROM _secrets
         ORDER BY created_at DESC`
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list secrets', { error });
      throw new Error('Failed to list secrets');
    } finally {
      client.release();
    }
  }

  /**
   * Update a secret
   */
  async updateSecret(id: string, input: UpdateSecretInput): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const updates: string[] = [];
      const values: (string | boolean | Date | null)[] = [];
      let paramCount = 1;

      if (input.value !== undefined) {
        const encryptedValue = EncryptionUtils.encrypt(input.value);
        updates.push(`value_ciphertext = $${paramCount++}`);
        values.push(encryptedValue);
      }

      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(input.isActive);
      }

      if (input.expiresAt !== undefined) {
        updates.push(`expires_at = $${paramCount++}`);
        values.push(input.expiresAt);
      }

      values.push(id);

      const result = await client.query(
        `UPDATE _secrets
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}`,
        values
      );

      const success = (result.rowCount ?? 0) > 0;
      if (success) {
        logger.info('Secret updated', { id });
      }
      return success;
    } catch (error) {
      logger.error('Failed to update secret', { error, id });
      throw new Error('Failed to update secret');
    } finally {
      client.release();
    }
  }

  /**
   * Check if a secret value matches the stored value
   */
  async checkSecretByName(name: string, value: string): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT value_ciphertext FROM _secrets
         WHERE name = $1
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1`,
        [name]
      );

      if (result.rows.length === 0) {
        logger.warn('Secret not found for verification', { name });
        return false;
      }

      const decryptedValue = EncryptionUtils.decrypt(result.rows[0].value_ciphertext);
      const matches = decryptedValue === value;

      // Update last_used_at if the check was successful
      if (matches) {
        await client.query(
          `UPDATE _secrets
           SET last_used_at = NOW()
           WHERE name = $1
           AND is_active = true`,
          [name]
        );
        logger.info('Secret check successful', { name });
      } else {
        logger.warn('Secret check failed - value mismatch', { name });
      }

      return matches;
    } catch (error) {
      logger.error('Failed to check secret', { error, name });
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(id: string): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query('DELETE FROM _secrets WHERE id = $1', [id]);

      const success = (result.rowCount ?? 0) > 0;
      if (success) {
        logger.info('Secret deleted', { id });
      }
      return success;
    } catch (error) {
      logger.error('Failed to delete secret', { error, id });
      throw new Error('Failed to delete secret');
    } finally {
      client.release();
    }
  }

  /**
   * Rotate a secret (create new value, keep old for grace period)
   */
  async rotateSecret(id: string, newValue: string): Promise<{ newId: string }> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');

      const oldSecretResult = await client.query(`SELECT name FROM _secrets WHERE id = $1`, [id]);

      if (oldSecretResult.rows.length === 0) {
        throw new Error('Secret not found');
      }

      const secretName = oldSecretResult.rows[0].name;

      await client.query(
        `UPDATE _secrets
         SET is_active = false,
             expires_at = NOW() + INTERVAL '24 hours'
         WHERE id = $1`,
        [id]
      );

      const encryptedValue = EncryptionUtils.encrypt(newValue);
      const newSecretResult = await client.query(
        `INSERT INTO _secrets (name, value_ciphertext)
         VALUES ($1, $2)
         RETURNING id`,
        [secretName, encryptedValue]
      );

      await client.query('COMMIT');

      logger.info('Secret rotated', {
        oldId: id,
        newId: newSecretResult.rows[0].id,
        name: secretName,
      });

      return { newId: newSecretResult.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to rotate secret', { error, id });
      throw new Error('Failed to rotate secret');
    } finally {
      client.release();
    }
  }

  /**
   * Clean up expired secrets
   */
  async cleanupExpiredSecrets(): Promise<number> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `DELETE FROM _secrets
         WHERE expires_at IS NOT NULL
         AND expires_at < NOW()
         RETURNING id`
      );

      const deletedCount = result.rowCount ?? 0;
      if (deletedCount > 0) {
        logger.info('Expired secrets cleaned up', { count: deletedCount });
      }
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired secrets', { error });
      throw new Error('Failed to cleanup expired secrets');
    } finally {
      client.release();
    }
  }

  /**
   * Generate a new API key with 'ik_' prefix (Insforge Key)
   */
  generateApiKey(): string {
    return 'ik_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify API key against database
   */
  async verifyApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) {
      return false;
    }
    return this.checkSecretByName('API_KEY', apiKey);
  }

  /**
   * Initialize API key on startup
   * Seeds from environment variable if database is empty
   */
  async initializeApiKey(): Promise<string> {
    let apiKey = await this.getSecretByName('API_KEY');

    if (!apiKey) {
      // Check if ACCESS_API_KEY is provided via environment
      const envApiKey = process.env.ACCESS_API_KEY;

      if (envApiKey && envApiKey.trim() !== '') {
        // Use the provided API key from environment, ensure it has 'ik_' prefix
        apiKey = envApiKey.startsWith('ik_') ? envApiKey : 'ik_' + envApiKey;
        await this.createSecret({ name: 'API_KEY', value: apiKey });
        logger.info('✅ API key initialized from ACCESS_API_KEY environment variable');
      } else {
        // Generate a new API key if none provided
        apiKey = this.generateApiKey();
        await this.createSecret({ name: 'API_KEY', value: apiKey });
        logger.info('✅ API key generated and stored');
      }
    } else {
      logger.info('✅ API key exists in database');
    }

    return apiKey;
  }
}
