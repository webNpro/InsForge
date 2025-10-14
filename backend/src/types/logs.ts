// Audit log types
export interface AuditLogEntry {
  actor: string;
  action: string;
  module: string;
  details?: Record<string, unknown>;
  ip_address?: string;
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

// Analytics log types (matching shared-schemas)
export interface LogSource {
  id: number;
  name: string;
  token: string;
}

export interface AnalyticsLogRecord {
  id: string;
  timestamp: string;
  event_message: string;
  body: Record<string, unknown>;
  source?: string;
}

export interface LogSourceStats {
  source: string;
  count: number;
  lastActivity: string;
}

export interface AnalyticsLogResponse {
  source: string;
  logs: AnalyticsLogRecord[];
  total: number;
  page: number;
  pageSize: number;
}
