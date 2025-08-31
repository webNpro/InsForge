import { Router, Response, NextFunction } from 'express';
import { QueryResult } from 'pg';
import { DatabaseManager } from '@/core/database/database.js';
import { verifyAdmin, AuthRequest } from '@/api/middleware/auth.js';
import { AppError } from '@/api/middleware/error.js';
import { ERROR_CODES } from '@/types/error-constants.js';
import { upload, handleUploadError } from '@/api/middleware/upload.js';
import {
  rawSQLRequestSchema,
  exportRequestSchema,
  importRequestSchema,
  type RawSQLResponse,
  type ExportResponse,
  type ImportResponse,
} from '@insforge/shared-schemas';

const router = Router();
const dbManager = DatabaseManager.getInstance();

/**
 * Execute raw SQL query
 * POST /api/database/advance/rawsql
 */
router.post('/rawsql', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validation = rawSQLRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const { query, params = [] } = validation.data;

    // Basic SQL injection prevention - check for dangerous patterns
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /CREATE\s+DATABASE/i,
      /ALTER\s+DATABASE/i,
      /pg_catalog/i,
      /information_schema/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new AppError('Query contains restricted operations', 403, ERROR_CODES.FORBIDDEN);
      }
    }

    // Execute query with timeout
    const pool = dbManager.getPool();
    const client = await pool.connect();
    try {
      await client.query('SET statement_timeout = 30000'); // 30 second timeout
      
      const result: QueryResult = await client.query(query, params);
      
      const response: RawSQLResponse = {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({
          name: f.name,
          dataTypeID: f.dataTypeID
        }))
      };
      res.json(response);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Raw SQL execution error:', error);
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: 'SQL_EXECUTION_ERROR',
        message: error.message,
        statusCode: error.statusCode
      });
    } else {
      res.status(400).json({
        error: 'SQL_EXECUTION_ERROR',
        message: error.message || 'Failed to execute SQL query',
        statusCode: 400
      });
    }
  }
});

/**
 * Export database data
 * POST /api/database/advance/export
 */
router.post('/export', verifyAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validation = exportRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const { tables, format, includeData } = validation.data;
    
    const pool = dbManager.getPool();
    const client = await pool.connect();
    try {
      let exportData: any;
      
      if (format === 'sql') {
        let sqlExport = '';
        
        // Get list of tables to export
        let tablesToExport: string[] = tables || [];
        if (!tables || tables.length === 0) {
          const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
          `);
          tablesToExport = tablesResult.rows.map((r: any) => r.tablename);
        }
        
        // Export each table
        for (const table of tablesToExport) {
          // Validate table name to prevent injection
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            continue;
          }
          
          // Always export table schema
          const schemaResult = await client.query(`
              SELECT 
                'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
                string_agg(
                  column_name || ' ' || 
                  data_type || 
                  CASE 
                    WHEN character_maximum_length IS NOT NULL 
                    THEN '(' || character_maximum_length || ')'
                    ELSE ''
                  END ||
                  CASE 
                    WHEN is_nullable = 'NO' THEN ' NOT NULL'
                    ELSE ''
                  END,
                  ', '
                ) || ');' as create_statement
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = $1
              GROUP BY table_name
            `, [table]);
            
          if (schemaResult.rows.length > 0) {
            sqlExport += `-- Table: ${table}\n`;
            sqlExport += schemaResult.rows[0].create_statement + '\n\n';
          }
          
          // Export data if requested
          if (includeData) {
            const dataResult = await client.query(`SELECT * FROM ${table}`);
            if (dataResult.rows.length > 0) {
              sqlExport += `-- Data for table: ${table}\n`;
              for (const row of dataResult.rows) {
                const columns = Object.keys(row).join(', ');
                const values = Object.values(row)
                  .map(v => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
                  .join(', ');
                sqlExport += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
              }
              sqlExport += '\n';
            }
          }
        }
        
        exportData = sqlExport;
      } else if (format === 'json') {
        const exportJson: any = {
          timestamp: new Date().toISOString(),
          tables: {}
        };
        
        // Get list of tables to export
        let tablesToExport: string[] = tables || [];
        if (!tables || tables.length === 0) {
          const tablesResult = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
          `);
          tablesToExport = tablesResult.rows.map((r: any) => r.tablename);
        }
        
        // Export each table
        for (const table of tablesToExport) {
          // Validate table name
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            continue;
          }
          
          const tableData: any = {};
          
          // Always include schema
          const schemaResult = await client.query(`
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [table]);
          
          tableData.schema = schemaResult.rows;
          
          // Include data if requested
          if (includeData) {
            const dataResult = await client.query(`SELECT * FROM ${table}`);
            tableData.rows = dataResult.rows;
          } else {
            tableData.rows = [];
          }
          
          exportJson.tables[table] = tableData;
        }
        
        exportData = exportJson;
      } else {
        throw new AppError('Invalid export format', 400, ERROR_CODES.INVALID_INPUT);
      }
      
      const response: ExportResponse = {
        format,
        data: exportData,
        timestamp: new Date().toISOString()
      };
      res.json(response);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Database export error:', error);
    res.status(500).json({
      error: 'EXPORT_ERROR',
      message: error.message || 'Failed to export database',
      statusCode: 500
    });
  }
});

/**
 * Import database data from SQL file
 * POST /api/database/advance/import
 * Expects a SQL file upload via multipart/form-data
 */
router.post('/import', 
  verifyAdmin, 
  upload.single('file'),
  handleUploadError,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validation = importRequestSchema.safeParse(req.body);
    if (!validation.success) {
      throw new AppError(
        validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400,
        ERROR_CODES.INVALID_INPUT
      );
    }
    
    const { truncate } = validation.data;
    
    if (!req.file) {
      throw new AppError('SQL file is required', 400, ERROR_CODES.INVALID_INPUT);
    }
    
    // Validate file type
    const allowedExtensions = ['.sql', '.txt'];
    const fileExtension = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw new AppError('Only .sql files are allowed', 400, ERROR_CODES.INVALID_INPUT);
    }
    
    // Convert buffer to string
    const data = req.file.buffer.toString('utf-8');
    
    const pool = dbManager.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      let importedTables: string[] = [];
      let totalRows = 0;
      
      // If truncate is requested, truncate all public tables first
      if (truncate) {
        const tablesResult = await client.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename NOT LIKE '\_%'
        `);
        
        for (const row of tablesResult.rows) {
          try {
            await client.query(`TRUNCATE TABLE ${row.tablename} CASCADE`);
            console.log(`Truncated table: ${row.tablename}`);
          } catch (err) {
            console.warn(`Could not truncate table ${row.tablename}:`, err);
          }
        }
      }
      
      // Process SQL file
      // Split SQL into individual statements
        const statements = data
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
          // Basic validation to prevent dangerous operations
          if (/DROP\s+DATABASE/i.test(statement) || 
              /CREATE\s+DATABASE/i.test(statement) ||
              /ALTER\s+DATABASE/i.test(statement)) {
            throw new AppError('Import contains restricted operations', 403, ERROR_CODES.FORBIDDEN);
          }
          
          try {
            const result = await client.query(statement);
            if (statement.toUpperCase().startsWith('INSERT')) {
              totalRows += result.rowCount || 0;
              
              // Extract table name from INSERT statement
              const tableMatch = statement.match(/INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
              if (tableMatch && !importedTables.includes(tableMatch[1])) {
                importedTables.push(tableMatch[1]);
              }
            }
          } catch (err: any) {
            console.error(`Failed to execute statement: ${statement.substring(0, 100)}...`, err);
            throw new AppError(`Import failed: ${err.message}`, 400, ERROR_CODES.INVALID_INPUT);
          }
        }
      
      await client.query('COMMIT');
      
      const response: ImportResponse = {
        success: true,
        message: 'SQL file imported successfully',
        filename: req.file.originalname,
        tables: importedTables,
        rowsImported: totalRows,
        fileSize: req.file.size
      };
      res.json(response);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Database import error:', error);
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: 'IMPORT_ERROR',
        message: error.message,
        statusCode: error.statusCode
      });
    } else {
      res.status(500).json({
        error: 'IMPORT_ERROR',
        message: error.message || 'Failed to import database',
        statusCode: 500
      });
    }
  }
});

export default router;