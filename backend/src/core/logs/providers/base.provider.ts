import { LogSchema, LogSourceSchema, LogStatsSchema } from '@insforge/shared-schemas';
import { LogSource, AnalyticsLogRecord, LogSourceStats } from '@/types/logs.js';

export interface LogProvider {
  initialize(): Promise<void>;

  getLogSources(): Promise<LogSourceSchema[]>;

  getLogsBySource(
    sourceName: string,
    limit?: number,
    beforeTimestamp?: string
  ): Promise<{
    logs: LogSchema[];
    total: number;
    tableName: string;
  }>;

  getLogSourceStats(): Promise<LogStatsSchema[]>;

  searchLogs(
    query: string,
    sourceName?: string,
    limit?: number,
    offset?: number
  ): Promise<{
    logs: (LogSchema & { source: string })[];
    total: number;
  }>;

  close(): Promise<void>;
}

// Base class with common functionality
export abstract class BaseLogProvider implements LogProvider {
  // Source name mapping for user-friendly display
  protected sourceNameMap: Record<string, string> = {
    'cloudflare.logs.prod': 'insforge.logs',
    'deno-relay-logs': 'function.logs',
    'postgREST.logs.prod': 'postgREST.logs',
    'postgres.logs': 'postgres.logs',
  };

  // Reverse mapping for API calls
  protected reverseSourceNameMap: Record<string, string> = {
    'insforge.logs': 'cloudflare.logs.prod',
    'function.logs': 'deno-relay-logs',
    'postgREST.logs': 'postgREST.logs.prod',
    'postgres.logs': 'postgres.logs',
  };

  // Convert internal source name to display name
  protected getDisplayName(sourceName: string): string {
    return this.sourceNameMap[sourceName] || sourceName;
  }

  // Convert display name back to internal source name
  protected getInternalName(displayName: string): string {
    return this.reverseSourceNameMap[displayName] || displayName;
  }

  abstract initialize(): Promise<void>;
  abstract getLogSources(): Promise<LogSourceSchema[]>;
  abstract getLogsBySource(
    sourceName: string,
    limit?: number,
    beforeTimestamp?: string
  ): Promise<{
    logs: LogSchema[];
    total: number;
    tableName: string;
  }>;
  abstract getLogSourceStats(): Promise<LogStatsSchema[]>;
  abstract searchLogs(
    query: string,
    sourceName?: string,
    limit?: number,
    offset?: number
  ): Promise<{
    logs: (LogSchema & { source: string })[];
    total: number;
  }>;
  abstract close(): Promise<void>;
}

// Analytics Provider Interface
export interface AnalyticsProvider {
  initialize(): Promise<void>;
  getLogSources(): Promise<LogSource[]>;
  getLogsBySource(
    sourceName: string,
    limit?: number,
    beforeTimestamp?: string
  ): Promise<{
    logs: AnalyticsLogRecord[];
    total: number;
    tableName: string;
  }>;
  getLogSourceStats(): Promise<LogSourceStats[]>;
  searchLogs(
    query: string,
    sourceName?: string,
    limit?: number,
    offset?: number
  ): Promise<{
    logs: (AnalyticsLogRecord & { source: string })[];
    total: number;
  }>;
  close(): Promise<void>;
}

// Base Analytics Provider
export abstract class BaseAnalyticsProvider implements AnalyticsProvider {
  protected sourceNameMap: Record<string, string> = {
    'cloudflare.logs.prod': 'insforge.logs',
    'deno-relay-logs': 'function.logs',
    'postgREST.logs.prod': 'postgREST.logs',
    'postgres.logs': 'postgres.logs',
  };

  protected reverseSourceNameMap: Record<string, string> = {
    'insforge.logs': 'cloudflare.logs.prod',
    'function.logs': 'deno-relay-logs',
    'postgREST.logs': 'postgREST.logs.prod',
    'postgres.logs': 'postgres.logs',
  };

  protected getDisplayName(sourceName: string): string {
    return this.sourceNameMap[sourceName] || sourceName;
  }

  protected getInternalName(displayName: string): string {
    return this.reverseSourceNameMap[displayName] || displayName;
  }

  abstract initialize(): Promise<void>;
  abstract getLogSources(): Promise<LogSource[]>;
  abstract getLogsBySource(
    sourceName: string,
    limit?: number,
    beforeTimestamp?: string
  ): Promise<{
    logs: AnalyticsLogRecord[];
    total: number;
    tableName: string;
  }>;
  abstract getLogSourceStats(): Promise<LogSourceStats[]>;
  abstract searchLogs(
    query: string,
    sourceName?: string,
    limit?: number,
    offset?: number
  ): Promise<{
    logs: (AnalyticsLogRecord & { source: string })[];
    total: number;
  }>;
  abstract close(): Promise<void>;
}
