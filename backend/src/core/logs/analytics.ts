import { LogSource, AnalyticsLogRecord, LogSourceStats } from '@/types/logs.js';
import logger from '@/utils/logger.js';
import { CloudWatchProvider } from './providers/cloudwatch.provider.js';
import { FileProvider } from './providers/file.provider.js';
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
    // Use CloudWatch if AWS credentials are available, otherwise use file-based logging
    const hasAwsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

    if (hasAwsCredentials) {
      logger.info('Using analytics provider: CloudWatch');
      this.provider = new CloudWatchProvider();
    } else {
      logger.info('Using analytics provider: File-based (no AWS credentials required)');
      this.provider = new FileProvider();
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
