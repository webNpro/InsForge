import { apiClient } from '@/lib/api/client';
import type {
  LogSourceSchema,
  LogSchema,
  GetLogsResponse,
  LogStatsSchema,
} from '@insforge/shared-schemas';

export class LogService {
  // Get all available log sources
  async getLogSources(): Promise<LogSourceSchema[]> {
    return apiClient.request('/logs/sources');
  }

  // Get statistics for all log sources
  async getLogSourceStats(): Promise<LogStatsSchema[]> {
    return apiClient.request('/logs/stats');
  }

  // Get logs from a specific source with timestamp-based pagination
  async getLogsBySource(
    sourceName: string,
    limit = 100,
    beforeTimestamp?: string
  ): Promise<GetLogsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (beforeTimestamp) {
      params.append('before_timestamp', beforeTimestamp);
    }

    return apiClient.request(`/logs/${sourceName}?${params.toString()}`);
  }

  // Search across all logs or specific source
  async searchLogs(
    query: string,
    sourceName?: string,
    limit = 100,
    offset = 0
  ): Promise<{
    records: LogSchema[];
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

    const response = await apiClient.request(`/logs/search?${params.toString()}`, {
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

export const logService = new LogService();
