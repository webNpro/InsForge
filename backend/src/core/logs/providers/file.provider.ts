import { promises as fs, createReadStream } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { LogSource, AnalyticsLogRecord, LogSourceStats } from '@/types/logs.js';
import { BaseAnalyticsProvider } from './base.provider.js';
import logger from '@/utils/logger.js';

export class FileProvider extends BaseAnalyticsProvider {
  private logsDir: string = '';
  private logFiles: Record<string, string> = {
    'insforge.logs': 'insforge.logs.jsonl',
  };

  async initialize(): Promise<void> {
    this.logsDir = path.resolve(process.cwd(), 'logs');
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch {
      // Directory already exists
    }
    logger.info(`File-based analytics initialized at: ${this.logsDir}`);
  }

  async getLogSources(): Promise<LogSource[]> {
    const sources: LogSource[] = [];
    let id = 1;

    for (const [name, filename] of Object.entries(this.logFiles)) {
      const filePath = path.join(this.logsDir, filename);
      try {
        await fs.access(filePath);
        sources.push({ id: id++, name, token: filename });
      } catch {
        // File doesn't exist, skip
      }
    }

    return sources;
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
    const filename = this.logFiles[sourceName];
    if (!filename) {
      return { logs: [], total: 0, tableName: sourceName };
    }

    const filePath = path.join(this.logsDir, filename);
    const logs = await this.readLogsFromFile(filePath, limit, beforeTimestamp);

    return {
      logs,
      total: logs.length,
      tableName: sourceName,
    };
  }

  private async readLogsFromFile(
    filePath: string,
    limit: number,
    beforeTimestamp?: string
  ): Promise<AnalyticsLogRecord[]> {
    try {
      await fs.access(filePath);
    } catch {
      return [];
    }

    const logs: AnalyticsLogRecord[] = [];
    const beforeMs = beforeTimestamp ? Date.parse(beforeTimestamp) : Date.now();

    const fileStream = createReadStream(filePath);
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) {
        continue;
      }

      try {
        const log = JSON.parse(line);
        const logTime = new Date(log.timestamp).getTime();

        if (logTime < beforeMs) {
          // Transform to match CloudWatch/Vector format
          const metadata = log.metadata || {};
          const body: Record<string, unknown> = {
            ...metadata,
            // Transform to snake_case to match Vector output
            user_agent: metadata.userAgent,
            status_code: metadata.status,
          };

          // Format event_message like Vector does for HTTP requests
          let eventMessage = log.message || '';
          if (log.message === 'HTTP Request' && metadata.method && metadata.path) {
            eventMessage = `${metadata.method} ${metadata.path} ${metadata.status} ${metadata.size} ${metadata.duration} - ${metadata.ip} - ${metadata.userAgent}`;
          }

          logs.push({
            id: log.id || `${logTime}-${Math.random()}`,
            timestamp: log.timestamp,
            event_message: eventMessage,
            body,
          });
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    // Return most recent logs up to limit
    return logs.slice(-limit);
  }

  async getLogSourceStats(): Promise<LogSourceStats[]> {
    const stats: LogSourceStats[] = [];

    for (const [name, filename] of Object.entries(this.logFiles)) {
      const filePath = path.join(this.logsDir, filename);
      try {
        const fileStats = await fs.stat(filePath);
        const logs = await this.readLogsFromFile(filePath, 1000);

        stats.push({
          source: name,
          count: logs.length,
          lastActivity: fileStats.mtime.toISOString(),
        });
      } catch {
        // File doesn't exist
      }
    }

    return stats;
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
    const results: (AnalyticsLogRecord & { source: string })[] = [];
    const searchLower = query.toLowerCase();

    const filesToSearch = sourceName
      ? [{ name: sourceName, filename: this.logFiles[sourceName] }]
      : Object.entries(this.logFiles).map(([name, filename]) => ({ name, filename }));

    for (const { name, filename } of filesToSearch) {
      if (!filename) {
        continue;
      }

      const filePath = path.join(this.logsDir, filename);
      const logs = await this.readLogsFromFile(filePath, 10000);

      for (const log of logs) {
        const messageMatch = log.event_message.toLowerCase().includes(searchLower);
        const metadataMatch = JSON.stringify(log.body).toLowerCase().includes(searchLower);

        if (messageMatch || metadataMatch) {
          results.push({ ...log, source: name });
        }
      }
    }

    return {
      logs: results.slice(offset, offset + limit),
      total: results.length,
    };
  }

  async close(): Promise<void> {
    // No cleanup needed for file-based provider
  }
}
