import { Pool } from 'pg';
import { DatabaseManager } from '@/core/database/database.js';
import logger from '@/utils/logger.js';
import { AIConfigurationSchema } from '@insforge/shared-schemas';

export class AIConfigService {
  private pool: Pool | null = null;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = DatabaseManager.getInstance().getPool();
    }
    return this.pool;
  }

  async create(
    modality: string,
    provider: string,
    model: string,
    systemPrompt?: string
  ): Promise<{ id: string }> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `INSERT INTO _ai_configs (modality, provider, model, system_prompt)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [modality, provider, model, systemPrompt || null]
      );

      logger.info('AI configuration created', { id: result.rows[0].id });
      return { id: result.rows[0].id };
    } catch (error) {
      logger.error('Failed to create AI configuration', { error });
      throw new Error('Failed to create AI configuration');
    } finally {
      client.release();
    }
  }

  async findAll(): Promise<AIConfigurationSchema[]> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT id, modality, provider, model, system_prompt as "systemPrompt", 
                token_used as "tokenUsed", requests_count as "requestsCount", created_at, updated_at
         FROM _ai_configs
         ORDER BY created_at DESC`
      );

      return result.rows.map((row) => ({
        id: row.id,
        modality: row.modality,
        provider: row.provider,
        model: row.model,
        systemPrompt: row.systemPrompt,
        tokenUsed: row.tokenUsed,
        requestsCount: row.requestsCount,
      }));
    } catch (error) {
      logger.error('Failed to fetch AI configurations', { error });
      throw new Error('Failed to fetch AI configurations');
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<AIConfigurationSchema | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT id, modality, provider, model, system_prompt as "systemPrompt", 
                token_used as "tokenUsed", requests_count as "requestsCount", created_at, updated_at
         FROM _ai_configs
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        modality: row.modality,
        provider: row.provider,
        model: row.model,
        systemPrompt: row.systemPrompt,
        tokenUsed: row.tokenUsed,
        requestsCount: row.requestsCount,
      };
    } catch (error) {
      logger.error('Failed to fetch AI configuration', { error, id });
      throw new Error('Failed to fetch AI configuration');
    } finally {
      client.release();
    }
  }

  async update(id: string, systemPrompt: string | null): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `UPDATE _ai_configs 
         SET system_prompt = $1, updated_at = NOW()
         WHERE id = $2`,
        [systemPrompt, id]
      );

      const success = (result.rowCount ?? 0) > 0;
      if (success) {
        logger.info('AI configuration updated', { id });
      }
      return success;
    } catch (error) {
      logger.error('Failed to update AI configuration', { error, id });
      throw new Error('Failed to update AI configuration');
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query('DELETE FROM _ai_configs WHERE id = $1', [id]);

      const success = (result.rowCount ?? 0) > 0;
      if (success) {
        logger.info('AI configuration deleted', { id });
      }
      return success;
    } catch (error) {
      logger.error('Failed to delete AI configuration', { error, id });
      throw new Error('Failed to delete AI configuration');
    } finally {
      client.release();
    }
  }

  async updateTokenUsage(id: string, tokensToAdd: number): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `UPDATE _ai_configs 
         SET token_used = token_used + $1, updated_at = NOW()
         WHERE id = $2`,
        [tokensToAdd, id]
      );

      const success = (result.rowCount ?? 0) > 0;
      if (success) {
        logger.info('Token usage updated', { id, tokensAdded: tokensToAdd });
      }
      return success;
    } catch (error) {
      logger.error('Failed to update token usage', { error, id });
      throw new Error('Failed to update token usage');
    } finally {
      client.release();
    }
  }

  async findByModelAndModality(
    model: string,
    modality: string
  ): Promise<AIConfigurationSchema | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT id, modality, provider, model, system_prompt as "systemPrompt", 
                token_used as "tokenUsed", requests_count as "requestsCount", created_at, updated_at
         FROM _ai_configs
         WHERE model = $1 AND modality = $2`,
        [model, modality]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        modality: row.modality,
        provider: row.provider,
        model: row.model,
        systemPrompt: row.systemPrompt,
        tokenUsed: row.tokenUsed,
        requestsCount: row.requestsCount,
      };
    } catch (error) {
      logger.error('Failed to fetch AI configuration by model and modality', {
        error,
        model,
        modality,
      });
      throw new Error('Failed to fetch AI configuration');
    } finally {
      client.release();
    }
  }

  async updateTokenUsageByModel(
    model: string,
    modality: string,
    tokensToAdd: number
  ): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `UPDATE _ai_configs 
         SET token_used = token_used + $1, updated_at = NOW()
         WHERE model = $2 AND modality = $3`,
        [tokensToAdd, model, modality]
      );

      const success = (result.rowCount ?? 0) > 0;
      if (success) {
        logger.info('Token usage updated', { model, modality, tokensAdded: tokensToAdd });
      }
      return success;
    } catch (error) {
      logger.error('Failed to update token usage', { error, model, modality });
      throw new Error('Failed to update token usage');
    } finally {
      client.release();
    }
  }

  async incrementRequestsCount(model: string, modality: string): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `UPDATE _ai_configs 
         SET requests_count = requests_count + 1, updated_at = NOW()
         WHERE model = $1 AND modality = $2`,
        [model, modality]
      );

      const success = (result.rowCount ?? 0) > 0;
      if (success) {
        logger.info('Requests count incremented', { model, modality });
      }
      return success;
    } catch (error) {
      logger.error('Failed to increment requests count', { error, model, modality });
      throw new Error('Failed to increment requests count');
    } finally {
      client.release();
    }
  }
}
