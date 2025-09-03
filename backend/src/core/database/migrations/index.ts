import { Client, PoolClient } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '@/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MigrationRunner {
  private client: Client | PoolClient;

  constructor(client: Client | PoolClient) {
    this.client = client;
  }

  /**
   * Run all migrations in order
   */
  async runAll(): Promise<void> {
    try {
      // Create migrations tracking table if it doesn't exist
      await this.createMigrationsTable();

      // Get all migration files
      const migrationFiles = await this.getMigrationFiles();

      // Run each migration
      for (const file of migrationFiles) {
        await this.runMigration(file);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', { error });
      throw error;
    }
  }

  /**
   * Create migrations tracking table
   */
  private async createMigrationsTable(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  /**
   * Get all migration files sorted by name
   */
  private async getMigrationFiles(): Promise<string[]> {
    const files = await fs.readdir(__dirname);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Files are named with numeric prefixes, so alphabetical sort works
  }

  /**
   * Run a single migration if not already executed
   */
  private async runMigration(filename: string): Promise<void> {
    // Check if migration has already been run
    const result = await this.client.query(
      'SELECT id FROM _migrations WHERE filename = $1',
      [filename]
    );

    if (result.rows.length > 0) {
      logger.debug(`Migration ${filename} already executed, skipping`);
      return;
    }

    // Read migration file
    const filePath = path.join(__dirname, filename);
    const sql = await fs.readFile(filePath, 'utf-8');

    // Execute migration
    logger.info(`Running migration: ${filename}`);
    await this.client.query(sql);

    // Record migration as executed
    await this.client.query(
      'INSERT INTO _migrations (filename) VALUES ($1)',
      [filename]
    );

    logger.info(`Migration ${filename} completed`);
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.client.query(
      'SELECT filename FROM _migrations ORDER BY executed_at'
    );
    return result.rows.map(row => row.filename);
  }
}