import { apiClient } from '@/lib/api/client';

export interface LogEntry {
  id: number;
  action: string;
  table_name: string;
  record_id: string | null;
  details: string | null;
  created_at: string;
}

export interface LogsResponse {
  records: LogEntry[];
  total: number;
}

export interface LogsStats {
  actionStats: Array<{ action: string; count: number }>;
  tableStats: Array<{ table_name: string; count: number }>;
  recentActivity: number;
  totalLogs: { count: number };
}

export class LogsService {
  async getLogs(
    limit = 100,
    offset = 0,
    filters?: { action?: string; table?: string }
  ): Promise<LogsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (filters?.action) {
      params.append('action', filters.action);
    }
    if (filters?.table) {
      params.append('table', filters.table);
    }

    const response = await apiClient.request(`/logs?${params.toString()}`, {
      includeHeaders: true,
    });

    // Traditional REST with pagination headers
    if (response.data && Array.isArray(response.data)) {
      return {
        records: response.data,
        total: response.pagination?.totalCount || response.data.length,
      };
    }

    // Fallback for unexpected response
    return {
      records: [],
      total: 0,
    };
  }

  async getStats(): Promise<LogsStats> {
    return apiClient.request('/logs/stats');
  }

  async clearLogs(before?: string): Promise<{ message: string; deleted: number }> {
    const params = before ? `?before=${before}` : '';
    return apiClient.request(`/logs${params}`, {
      method: 'DELETE',
    });
  }
}

export const logsService = new LogsService();
