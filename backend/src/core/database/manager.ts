import { Pool } from 'pg';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool!: Pool;
  private dataDir: string;

  private constructor() {
    this.dataDir = process.env.DATABASE_DIR || path.join(__dirname, '../../data');
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });

    // PostgreSQL connection configuration
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'insforge',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const client = await this.pool.connect();
    await client.query('BEGIN');

    // Note: Schema migrations are now handled by node-pg-migrate
    // Run: npm run migrate:up

    await client.query('COMMIT');
  }

  // PostgreSQL-specific prepare method that returns a query object similar to better-sqlite3
  prepare(sql: string) {
    return {
      all: async (...params: unknown[]) => {
        const client = await this.pool.connect();
        try {
          // Convert SQLite parameter placeholders (?) to PostgreSQL ($1, $2, etc.)
          let pgSql = sql;
          let paramIndex = 1;
          while (pgSql.includes('?')) {
            pgSql = pgSql.replace('?', `$${paramIndex}`);
            paramIndex++;
          }

          const result = await client.query(pgSql, params);
          return result.rows;
        } finally {
          client.release();
        }
      },

      get: async (...params: unknown[]) => {
        const client = await this.pool.connect();
        try {
          // Convert SQLite parameter placeholders
          let pgSql = sql;
          let paramIndex = 1;
          while (pgSql.includes('?')) {
            pgSql = pgSql.replace('?', `$${paramIndex}`);
            paramIndex++;
          }

          const result = await client.query(pgSql, params);
          return result.rows[0] || null;
        } finally {
          client.release();
        }
      },

      run: async (...params: unknown[]) => {
        const client = await this.pool.connect();
        try {
          // Convert SQLite parameter placeholders
          let pgSql = sql;
          let paramIndex = 1;
          while (pgSql.includes('?')) {
            pgSql = pgSql.replace('?', `$${paramIndex}`);
            paramIndex++;
          }

          const result = await client.query(pgSql, params);
          return {
            changes: result.rowCount || 0,
            lastInsertRowid: null, // PostgreSQL doesn't have this concept
          };
        } finally {
          client.release();
        }
      },

      exec: async () => {
        const client = await this.pool.connect();
        try {
          await client.query(sql);
        } finally {
          client.release();
        }
      },
    };
  }

  getDb() {
    return {
      prepare: (sql: string) => this.prepare(sql),
      exec: async (sql: string) => {
        const client = await this.pool.connect();
        try {
          await client.query(sql);
        } finally {
          client.release();
        }
      },
    };
  }

  static async getColumnTypeMap(tableName: string): Promise<Record<string, string>> {
    const instance = DatabaseManager.getInstance();
    const client = await instance.pool.connect();
    try {
      const result = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      const map: Record<string, string> = {};
      for (const row of result.rows) {
        map[row.column_name] = row.data_type;
      }
      return map;
    } finally {
      client.release();
    }
  }

  async getUserTableCount(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count 
         FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_type = 'BASE TABLE'
         AND table_name NOT LIKE '\\_%'`
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    } finally {
      client.release();
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
