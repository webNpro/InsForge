import { CloudWatchProvider } from './cloudwatch.provider.js';
import { BaseAnalyticsProvider } from './base.provider.js';
import { LogSource, AnalyticsLogRecord, LogSourceStats } from '@/types/logs.js';

export class CloudWatchAnalyticsProvider extends BaseAnalyticsProvider {
  private cloudWatchProvider: CloudWatchProvider;

  constructor() {
    super();
    this.cloudWatchProvider = new CloudWatchProvider();
  }

  async initialize(): Promise<void> {
    await this.cloudWatchProvider.initialize();
  }

  async getLogSources(): Promise<LogSource[]> {
    const sources = await this.cloudWatchProvider.getLogSources();
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      token: s.token,
    }));
  }

  async getLogsBySource(
    sourceName: string,
    limit?: number,
    beforeTimestamp?: string
  ): Promise<{
    logs: AnalyticsLogRecord[];
    total: number;
    tableName: string;
  }> {
    const result = await this.cloudWatchProvider.getLogsBySource(
      sourceName,
      limit,
      beforeTimestamp
    );
    return {
      logs: result.logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        event_message: log.eventMessage,
        body: log.body,
      })),
      total: result.total,
      tableName: result.tableName,
    };
  }

  async getLogSourceStats(): Promise<LogSourceStats[]> {
    return this.cloudWatchProvider.getLogSourceStats();
  }

  async searchLogs(
    query: string,
    sourceName?: string,
    limit?: number,
    offset?: number
  ): Promise<{
    logs: (AnalyticsLogRecord & { source: string })[];
    total: number;
  }> {
    const result = await this.cloudWatchProvider.searchLogs(query, sourceName, limit, offset);
    return {
      logs: result.logs.map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        event_message: log.eventMessage,
        body: log.body,
        source: log.source,
      })),
      total: result.total,
    };
  }

  async close(): Promise<void> {
    await this.cloudWatchProvider.close();
  }
}
