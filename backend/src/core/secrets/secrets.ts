import { Pool } from 'pg';
import crypto from 'crypto';
import { DatabaseManager } from '@/core/database/manager.js';
import logger from '@/utils/logger.js';

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
  private encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!key) {
      throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set for secrets encryption');
    }
    this.encryptionKey = crypto.createHash('sha256').update(key).digest();
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = DatabaseManager.getInstance().getPool();
    }
    return this.pool;
  }

  /**
   * Encrypt a value using AES-256-GCM
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
   * Decrypt a value using AES-256-GCM
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
   * Create a new secret
   */
  async create(input: CreateSecretInput): Promise<{ id: string }> {
    const client = await this.getPool().connect();
    try {
      const encryptedValue = this.encrypt(input.value);

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
  async getById(id: string): Promise<string | null> {
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

      const decryptedValue = this.decrypt(result.rows[0].value_ciphertext);
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
  async getByName(name: string): Promise<string | null> {
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

      const decryptedValue = this.decrypt(result.rows[0].value_ciphertext);
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
  async list(): Promise<SecretSchema[]> {
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
  async update(id: string, input: UpdateSecretInput): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const updates: string[] = [];
      const values: (string | boolean | Date | null)[] = [];
      let paramCount = 1;

      if (input.value !== undefined) {
        const encryptedValue = this.encrypt(input.value);
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
   * Delete a secret
   */
  async delete(id: string): Promise<boolean> {
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
  async rotate(id: string, newValue: string): Promise<{ newId: string }> {
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

      const encryptedValue = this.encrypt(newValue);
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
  async cleanupExpired(): Promise<number> {
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
}
