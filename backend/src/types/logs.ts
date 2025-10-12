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

// Types for system logs (CloudWatch)
export interface LogSource {
  id: number;
  name: string;
  token: string;
}

export interface LogRecord {
  id: string;
  event_message: string;
  timestamp: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>;
}

export interface LogsResponse {
  source: string;
  logs: LogRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LogSourceStats {
  source: string;
  count: number;
  lastActivity: string;
}
