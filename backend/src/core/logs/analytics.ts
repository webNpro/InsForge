import { LogSource, AnalyticsLogRecord, LogSourceStats } from '@/types/logs.js';
import logger from '@/utils/logger.js';
import { isCloudEnvironment } from '@/utils/environment.js';
import { LocalDBProvider } from './providers/localdb.provider.js';
import { CloudWatchProvider } from './providers/cloudwatch.provider.js';
import { AnalyticsProvider } from './providers/base.provider.js';

export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private provider!: AnalyticsProvider;

  private constructor() {}

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  async initialize(): Promise<void> {
    // Decide provider based on explicit override or cloud environment
    const explicitProvider = (process.env.ANALYTICS_PROVIDER || '').toLowerCase();
    const shouldUseCloudwatch =
      explicitProvider === 'cloudwatch' ||
      (!explicitProvider && isCloudEnvironment() && !!process.env.CLOUDWATCH_LOG_GROUP);

    logger.info(
      `Using analytics provider: ${shouldUseCloudwatch ? 'CloudWatch' : 'LocalDB/Postgres'}`
    );

    if (shouldUseCloudwatch) {
      this.provider = new CloudWatchProvider();
    } else {
      this.provider = new LocalDBProvider();
    }

    await this.provider.initialize();
  }

  async getLogSources(): Promise<LogSource[]> {
    return this.provider.getLogSources();
  }

  async getLogsBySource(
    sourceName: string,
    limit: number = 100,
    beforeTimestamp?: string
  ): Promise<{
    logs: AnalyticsLogRecord[];
    total: number;
    tableName: string;
  }> {
    return this.provider.getLogsBySource(sourceName, limit, beforeTimestamp);
  }

  async getLogSourceStats(): Promise<LogSourceStats[]> {
    return this.provider.getLogSourceStats();
  }

  async searchLogs(
    query: string,
    sourceName?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    logs: (AnalyticsLogRecord & { source: string })[];
    total: number;
  }> {
    return this.provider.searchLogs(query, sourceName, limit, offset);
  }

  async close(): Promise<void> {
    await this.provider.close();
  }
}
