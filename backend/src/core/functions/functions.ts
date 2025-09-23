import { DatabaseManager } from '@/core/database/manager.js';
import { EdgeFunctionMetadataSchema } from '@insforge/shared-schemas';
import logger from '@/utils/logger.js';

export class FunctionsService {
  private static instance: FunctionsService;
  private db;

  private constructor() {
    this.db = DatabaseManager.getInstance().getDb();
  }

  static getInstance(): FunctionsService {
    if (!FunctionsService.instance) {
      FunctionsService.instance = new FunctionsService();
    }
    return FunctionsService.instance;
  }

  async getMetadata(): Promise<Array<EdgeFunctionMetadataSchema>> {
    try {
      const functions = await this.db
        .prepare(
          `SELECT slug, name, description, status
          FROM _functions
          ORDER BY created_at DESC`
        )
        .all();

      return functions as Array<EdgeFunctionMetadataSchema>;
    } catch (error) {
      logger.error('Failed to get edge functions metadata', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
