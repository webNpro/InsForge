import { apiClient } from '@/lib/api/client';
import {
  GetAuditLogsResponse,
  ClearAuditLogsResponse,
  GetAuditLogsRequest,
  GetAuditLogStatsResponse,
} from '@insforge/shared-schemas';

export class LogsService {
  async getAuditLogs({
    limit = 100,
    offset = 0,
    ...filters
  }: GetAuditLogsRequest): Promise<GetAuditLogsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (filters?.actor) {
      params.append('actor', filters.actor);
    }
    if (filters?.action) {
      params.append('action', filters.action);
    }
    if (filters?.module) {
      params.append('module', filters.module);
    }
    if (filters?.startDate) {
      params.append('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('end_date', filters.endDate);
    }

    return apiClient.request(`/logs/audits?${params.toString()}`, {
      headers: apiClient.withAccessToken(),
    });
  }

  async getAuditLogStats(days = 7): Promise<GetAuditLogStatsResponse> {
    const params = new URLSearchParams({
      days: days.toString(),
    });

    return apiClient.request(`/logs/audits/stats?${params.toString()}`, {
      headers: apiClient.withAccessToken(),
    });
  }

  async clearAuditLogs(daysToKeep = 90): Promise<ClearAuditLogsResponse> {
    const params = new URLSearchParams({
      days_to_keep: daysToKeep.toString(),
    });

    return apiClient.request(`/logs/audits?${params.toString()}`, {
      method: 'DELETE',
      headers: apiClient.withAccessToken(),
    });
  }
}

// Analytics types
export interface LogSource {
  id: string;
  name: string;
  token: string;
}

export interface AnalyticsLogRecord {
  id: string;
  event_message: string;
  timestamp: string;
  body: Record<string, any>;
  source?: string; // Added for search results
}

export interface AnalyticsLogResponse {
  logs: AnalyticsLogRecord[];
  total: number;
  tableName: string;
}

export interface LogSourceStats {
  source: string;
  count: number;
  lastActivity: string;
}

class AnalyticsService {
  // Get all available log sources
  async getLogSources(): Promise<LogSource[]> {
    return apiClient.request('/logs/analytics/sources');
  }

  // Get statistics for all log sources
  async getLogSourceStats(): Promise<LogSourceStats[]> {
    return apiClient.request('/logs/analytics/stats');
  }

  // Get logs from a specific source with timestamp-based pagination
  async getLogsBySource(
    sourceName: string,
    limit = 100,
    beforeTimestamp?: string
  ): Promise<AnalyticsLogResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (beforeTimestamp) {
      params.append('before_timestamp', beforeTimestamp);
    }

    return apiClient.request(`/logs/analytics/${sourceName}?${params.toString()}`);
  }

  // Search across all logs or specific source
  async searchLogs(
    query: string,
    sourceName?: string,
    limit = 100,
    offset = 0
  ): Promise<{
    records: AnalyticsLogRecord[];
    total: number;
  }> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (sourceName) {
      params.append('source', sourceName);
    }

    const response = await apiClient.request(`/logs/analytics/search?${params.toString()}`, {
      returnFullResponse: true,
    });

    // Handle response - search returns {logs: [], total: number}
    if (response.logs && Array.isArray(response.logs)) {
      return {
        records: response.logs,
        total: response.total || response.logs.length,
      };
    }

    return {
      records: [],
      total: 0,
    };
  }
}

export const logsService = new LogsService();
export const analyticsService = new AnalyticsService();
