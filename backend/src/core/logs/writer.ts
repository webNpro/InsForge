import { promises as fs } from 'fs';
import path from 'path';
import logger from '@/utils/logger.js';

export class LogWriter {
  private static instance: LogWriter;
  private logsDir: string = '';
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): LogWriter {
    if (!LogWriter.instance) {
      LogWriter.instance = new LogWriter();
    }
    return LogWriter.instance;
  }

  async initialize(): Promise<void> {
    this.logsDir = path.resolve(process.cwd(), 'logs');
    await fs.mkdir(this.logsDir, { recursive: true });
    this.initialized = true;
    logger.info(`LogWriter initialized at: ${this.logsDir}`);
  }

  async writeInsforgeLog(message: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const logEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      message,
      level: 'info',
      metadata,
    };

    await this.appendToFile('insforge.logs.jsonl', logEntry);
  }

  async writeFunctionLog(message: string, metadata: Record<string, unknown>): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const logEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      message,
      level: 'info',
      metadata,
    };

    await this.appendToFile('function.logs.jsonl', logEntry);
  }

  private async appendToFile(filename: string, logEntry: Record<string, unknown>): Promise<void> {
    try {
      const filePath = path.join(this.logsDir, filename);
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(filePath, logLine, 'utf8');
    } catch (error) {
      // Silently fail to avoid disrupting application flow
      logger.debug('Failed to write log', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
