import logger from '@/utils/logger.js';
import { CloudWatchProvider } from './providers/cloudwatch.provider.js';
import { LogProvider } from './providers/base.provider.js';
import { LogSchema, LogSourceSchema, LogStatsSchema } from '@insforge/shared-schemas';

export class LogService {
  private static instance: LogService;
  private provider!: LogProvider;

  private constructor() {}

  static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  async initialize(): Promise<void> {
    // Always use CloudWatch provider for system logs
    logger.info('Using log provider: CloudWatch');
    this.provider = new CloudWatchProvider();
    await this.provider.initialize();
  }

  getLogSources(): Promise<LogSourceSchema[]> {
    return this.provider.getLogSources();
  }

  getLogsBySource(
    sourceName: string,
    limit: number = 100,
    beforeTimestamp?: string
  ): Promise<{
    logs: LogSchema[];
    total: number;
    tableName: string;
  }> {
    return this.provider.getLogsBySource(sourceName, limit, beforeTimestamp);
  }

  getLogSourceStats(): Promise<LogStatsSchema[]> {
    return this.provider.getLogSourceStats();
  }

  searchLogs(
    query: string,
    sourceName?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    logs: (LogSchema & { source: string })[];
    total: number;
  }> {
    return this.provider.searchLogs(query, sourceName, limit, offset);
  }

  async close(): Promise<void> {
    await this.provider.close();
  }
}
