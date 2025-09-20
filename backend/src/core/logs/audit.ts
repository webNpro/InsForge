import { DatabaseManager } from '@/core/database/manager.js';
import logger from '@/utils/logger.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';

export interface AuditLogEntry {
  actor: string;
  action: string;
  module: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

export interface AuditLogRecord {
  id: string;
  actor: string;
  action: string;
  module: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogQuery {
  actor?: string;
  action?: string;
  module?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  total_logs: number;
  unique_actors: number;
  unique_modules: number;
  actions_by_module: Record<string, number>;
  recent_activity: AuditLogRecord[];
}

export class AuditService {
  private static instance: AuditService;
  private db: ReturnType<DatabaseManager['getDb']>;

  private constructor() {
    const dbManager = DatabaseManager.getInstance();
    this.db = dbManager.getDb();
    logger.info('AuditService initialized');
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Create a new audit log entry
   */
  async log(entry: AuditLogEntry): Promise<AuditLogRecord> {
    try {
      const result = await this.db
        .prepare(
          `INSERT INTO _audit_logs (actor, action, module, details, ip_address)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`
        )
        .get(
          entry.actor,
          entry.action,
          entry.module,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.ip_address || null
        );

      logger.info('Audit log created', {
        actor: entry.actor,
        action: entry.action,
        module: entry.module,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create audit log', error);
      throw new AppError('Failed to create audit log', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  }

  /**
   * Query audit logs with filters
   */
  async query(query: AuditLogQuery): Promise<AuditLogRecord[]> {
    try {
      let sql = 'SELECT * FROM _audit_logs WHERE 1=1';
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query.actor) {
        sql += ` AND actor = $${paramIndex++}`;
        params.push(query.actor);
      }

      if (query.action) {
        sql += ` AND action = $${paramIndex++}`;
        params.push(query.action);
      }

      if (query.module) {
        sql += ` AND module = $${paramIndex++}`;
        params.push(query.module);
      }

      if (query.start_date) {
        sql += ` AND created_at >= $${paramIndex++}`;
        params.push(query.start_date.toISOString());
      }

      if (query.end_date) {
        sql += ` AND created_at <= $${paramIndex++}`;
        params.push(query.end_date.toISOString());
      }

      sql += ' ORDER BY created_at DESC';

      if (query.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(query.offset);
      }

      const results = await this.db.prepare(sql).all(...params);
      return results;
    } catch (error) {
      logger.error('Failed to query audit logs', error);
      throw new AppError('Failed to query audit logs', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  }

  /**
   * Get audit log by ID
   */
  async getById(id: string): Promise<AuditLogRecord | null> {
    try {
      const result = await this.db.prepare('SELECT * FROM _audit_logs WHERE id = $1').get(id);

      return result || null;
    } catch (error) {
      logger.error('Failed to get audit log by ID', error);
      throw new AppError('Failed to get audit log', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  }

  /**
   * Get audit log statistics
   */
  async getStats(days: number = 7): Promise<AuditLogStats> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [totalLogs] = await this.db
        .prepare('SELECT COUNT(*) as count FROM _audit_logs WHERE created_at >= $1')
        .get(startDate.toISOString());

      const [uniqueActors] = await this.db
        .prepare('SELECT COUNT(DISTINCT actor) as count FROM _audit_logs WHERE created_at >= $1')
        .get(startDate.toISOString());

      const [uniqueModules] = await this.db
        .prepare('SELECT COUNT(DISTINCT module) as count FROM _audit_logs WHERE created_at >= $1')
        .get(startDate.toISOString());

      const actionsByModule = await this.db
        .prepare(
          `SELECT module, COUNT(*) as count
           FROM _audit_logs
           WHERE created_at >= $1
           GROUP BY module`
        )
        .all(startDate.toISOString());

      const recentActivity = await this.db
        .prepare(
          `SELECT * FROM _audit_logs
           WHERE created_at >= $1
           ORDER BY created_at DESC
           LIMIT 10`
        )
        .all(startDate.toISOString());

      const moduleStats: Record<string, number> = {};
      actionsByModule.forEach((row: { module: string; count: string }) => {
        moduleStats[row.module] = parseInt(row.count);
      });

      return {
        total_logs: parseInt(totalLogs?.count || 0),
        unique_actors: parseInt(uniqueActors?.count || 0),
        unique_modules: parseInt(uniqueModules?.count || 0),
        actions_by_module: moduleStats,
        recent_activity: recentActivity,
      };
    } catch (error) {
      logger.error('Failed to get audit log statistics', error);
      throw new AppError('Failed to get audit statistics', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.db
        .prepare('DELETE FROM _audit_logs WHERE created_at < $1 RETURNING id')
        .all(cutoffDate.toISOString());

      const deletedCount = result.length;

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} audit logs older than ${daysToKeep} days`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup audit logs', error);
      throw new AppError('Failed to cleanup audit logs', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  }

  /**
   * Get audit logs by actor
   */
  async getByActor(actor: string, limit: number = 100): Promise<AuditLogRecord[]> {
    try {
      const results = await this.db
        .prepare(
          `SELECT * FROM _audit_logs
           WHERE actor = $1
           ORDER BY created_at DESC
           LIMIT $2`
        )
        .all(actor, limit);

      return results;
    } catch (error) {
      logger.error('Failed to get audit logs by actor', error);
      throw new AppError('Failed to get audit logs by actor', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  }

  /**
   * Get audit logs by module
   */
  async getByModule(module: string, limit: number = 100): Promise<AuditLogRecord[]> {
    try {
      const results = await this.db
        .prepare(
          `SELECT * FROM _audit_logs
           WHERE module = $1
           ORDER BY created_at DESC
           LIMIT $2`
        )
        .all(module, limit);

      return results;
    } catch (error) {
      logger.error('Failed to get audit logs by module', error);
      throw new AppError('Failed to get audit logs by module', 500, ERROR_CODES.INTERNAL_ERROR);
    }
  }
}
