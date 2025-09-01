import { DatabaseManager } from '@/core/database/database.js';
import { MetadataService } from '@/core/metadata/metadata.js';
import { AppError } from '@/api/middleware/error.js';
import {
  type RawSQLResponse,
  type ExportDatabaseResponse,
  type ExportDatabaseJsonData,
  type ImportDatabaseResponse,
} from '@insforge/shared-schemas';

export class DatabaseController {
  private dbManager = DatabaseManager.getInstance();

  async executeRawSQL(query: string, params: unknown[] = []): Promise<RawSQLResponse> {
    // Basic SQL injection prevention - check for dangerous patterns
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /CREATE\s+DATABASE/i,
      /ALTER\s+DATABASE/i,
      /pg_catalog/i,
      /information_schema/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new AppError('Query contains restricted operations', 403, 'FORBIDDEN');
      }
    }

    const pool = this.dbManager.getPool();
    const client = await pool.connect();

    try {
      // Execute query with timeout
      const result = (await Promise.race([
        client.query(query, params),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 30000)),
      ])) as { rows: unknown[]; rowCount: number; fields?: { name: string; dataTypeID: number }[] };

      // Refresh schema cache if it was a DDL operation
      if (/CREATE|ALTER|DROP/i.test(query)) {
        await client.query(`NOTIFY pgrst, 'reload schema';`);
        await MetadataService.getInstance().updateDatabaseMetadata();
      }

      const response: RawSQLResponse = {
        rows: result.rows || [],
        rowCount: result.rowCount,
        fields: result.fields?.map((field: { name: string; dataTypeID: number }) => ({
          name: field.name,
          dataTypeID: field.dataTypeID,
        })),
      };

      return response;
    } finally {
      client.release();
    }
  }

  async exportDatabase(
    tables?: string[],
    format: 'sql' | 'json' = 'sql',
    includeData: boolean = true
  ): Promise<ExportDatabaseResponse> {
    const pool = this.dbManager.getPool();
    const client = await pool.connect();

    try {
      // Get tables to export
      let tablesToExport: string[];
      if (tables && tables.length > 0) {
        tablesToExport = tables;
      } else {
        const tablesResult = await client.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          ORDER BY tablename
        `);
        tablesToExport = tablesResult.rows.map((row: { tablename: string }) => row.tablename);
      }

      const timestamp = new Date().toISOString();

      if (format === 'sql') {
        let sqlExport = `-- Database Export\n-- Generated on: ${timestamp}\n-- Format: SQL\n-- Include Data: ${includeData}\n\n`;

        for (const table of tablesToExport) {
          // Always export table schema with defaults
          const schemaResult = await client.query(
            `
            SELECT 'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
            string_agg(column_name || ' ' || 
              CASE 
                WHEN data_type = 'character varying' THEN 'varchar' || COALESCE('(' || character_maximum_length || ')', '')
                WHEN data_type = 'timestamp with time zone' THEN 'timestamptz'
                ELSE data_type
              END || 
              CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
              CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
              ', ') || ');' as create_statement
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            GROUP BY table_name
          `,
            [table]
          );

          if (schemaResult.rows.length > 0) {
            sqlExport += `-- Table: ${table}\n`;
            sqlExport += schemaResult.rows[0].create_statement + '\n\n';
          }

          // Export indexes (excluding primary key indexes)
          const indexesResult = await client.query(
            `
            SELECT 
              indexname,
              indexdef
            FROM pg_indexes 
            WHERE tablename = $1 
            AND schemaname = 'public'
            AND indexname NOT LIKE '%_pkey'
            ORDER BY indexname
          `,
            [table]
          );

          if (indexesResult.rows.length > 0) {
            sqlExport += `-- Indexes for table: ${table}\n`;
            for (const indexRow of indexesResult.rows) {
              sqlExport += indexRow.indexdef + ';\n';
            }
            sqlExport += '\n';
          }

          // Export foreign key constraints
          const foreignKeysResult = await client.query(
            `
            SELECT 
              'ALTER TABLE ' || quote_ident(tc.table_name) || 
              ' ADD CONSTRAINT ' || quote_ident(tc.constraint_name) || 
              ' FOREIGN KEY (' || quote_ident(kcu.column_name) || ')' ||
              ' REFERENCES ' || quote_ident(ccu.table_name) || 
              ' (' || quote_ident(ccu.column_name) || ')' ||
              CASE 
                WHEN rc.delete_rule != 'NO ACTION' THEN ' ON DELETE ' || rc.delete_rule
                ELSE ''
              END ||
              CASE 
                WHEN rc.update_rule != 'NO ACTION' THEN ' ON UPDATE ' || rc.update_rule  
                ELSE ''
              END || ';' as fk_statement
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            LEFT JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
              AND tc.table_schema = rc.constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = $1
            AND tc.table_schema = 'public'
          `,
            [table]
          );

          if (foreignKeysResult.rows.length > 0) {
            sqlExport += `-- Foreign key constraints for table: ${table}\n`;
            for (const fkRow of foreignKeysResult.rows) {
              sqlExport += fkRow.fk_statement + '\n';
            }
            sqlExport += '\n';
          }

          // Export RLS policies
          const policiesResult = await client.query(
            `
            SELECT 
              'CREATE POLICY ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) ||
              ' FOR ' || cmd ||
              CASE 
                WHEN roles != '{}'::name[] THEN ' TO ' || array_to_string(roles, ', ')
                ELSE ''
              END ||
              CASE 
                WHEN qual IS NOT NULL THEN ' USING (' || qual || ')'
                ELSE ''
              END ||
              CASE 
                WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')'
                ELSE ''
              END || ';' as policy_statement
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = $1
            ORDER BY policyname
          `,
            [table]
          );

          if (policiesResult.rows.length > 0) {
            sqlExport += `-- RLS policies for table: ${table}\n`;
            for (const policyRow of policiesResult.rows) {
              sqlExport += policyRow.policy_statement + '\n';
            }
            sqlExport += '\n';
          }

          // Export data if requested
          if (includeData) {
            const dataResult = await client.query(`SELECT * FROM ${table}`);
            if (dataResult.rows.length > 0) {
              sqlExport += `-- Data for table: ${table}\n`;
              for (const row of dataResult.rows) {
                const columns = Object.keys(row);
                const values = Object.values(row).map((val) =>
                  val === null
                    ? 'NULL'
                    : typeof val === 'string'
                      ? `'${val.replace(/'/g, "''")}'`
                      : String(val)
                );
                sqlExport += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
              }
              sqlExport += '\n';
            }
          }
        }

        return {
          format: 'sql',
          data: sqlExport,
          timestamp,
        };
      } else {
        // JSON format
        const jsonData: ExportDatabaseJsonData = {
          timestamp,
          tables: {},
        };

        for (const table of tablesToExport) {
          // Get schema
          const schemaResult = await client.query(
            `
            SELECT 
              column_name as "columnName",
              data_type as "dataType", 
              character_maximum_length as "characterMaximumLength",
              is_nullable as "isNullable",
              column_default as "columnDefault"
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `,
            [table]
          );

          // Get indexes
          const indexesResult = await client.query(
            `
            SELECT 
              indexname,
              indexdef,
              indisunique as "isUnique",
              indisprimary as "isPrimary"
            FROM pg_indexes 
            JOIN pg_class ON pg_class.relname = pg_indexes.tablename
            JOIN pg_index ON pg_index.indexrelid = (SELECT oid FROM pg_class WHERE relname = pg_indexes.indexname)
            WHERE pg_indexes.tablename = $1 
            AND pg_indexes.schemaname = 'public'
            ORDER BY indexname
          `,
            [table]
          );

          // Get foreign keys
          const foreignKeysResult = await client.query(
            `
            SELECT 
              tc.constraint_name as "constraintName",
              kcu.column_name as "columnName", 
              ccu.table_name as "foreignTableName",
              ccu.column_name as "foreignColumnName",
              rc.delete_rule as "deleteRule",
              rc.update_rule as "updateRule"
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            LEFT JOIN information_schema.referential_constraints AS rc
              ON tc.constraint_name = rc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = $1
          `,
            [table]
          );

          // Get policies
          const policiesResult = await client.query(
            `
            SELECT 
              policyname,
              cmd,
              roles,
              qual,
              with_check as "withCheck"
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = $1
          `,
            [table]
          );

          // Get data if requested
          let rows: unknown[] = [];
          if (includeData) {
            const dataResult = await client.query(`SELECT * FROM ${table}`);
            rows = dataResult.rows;
          }

          jsonData.tables[table] = {
            schema: schemaResult.rows,
            indexes: indexesResult.rows,
            foreignKeys: foreignKeysResult.rows,
            policies: policiesResult.rows,
            rows,
          };
        }

        return {
          format: 'json',
          data: jsonData,
          timestamp,
        };
      }
    } finally {
      client.release();
    }
  }

  async importDatabase(
    fileBuffer: Buffer,
    filename: string,
    fileSize: number,
    truncate: boolean = false
  ): Promise<ImportDatabaseResponse> {
    // Validate file type
    const allowedExtensions = ['.sql', '.txt'];
    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      throw new AppError('Only .sql files are allowed', 400, 'INVALID_INPUT');
    }

    // Convert buffer to string
    const data = fileBuffer.toString('utf-8');

    const pool = this.dbManager.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const importedTables: string[] = [];
      let totalRows = 0;

      // If truncate is requested, truncate all public tables first
      if (truncate) {
        const tablesResult = await client.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
        `);

        for (const row of tablesResult.rows) {
          try {
            await client.query(`TRUNCATE TABLE ${row.tablename} CASCADE`);
            console.warn(`Truncated table: ${row.tablename}`);
          } catch (err) {
            console.warn(`Could not truncate table ${row.tablename}:`, err);
          }
        }
      }

      // Process SQL file
      // Split SQL into individual statements, handling multi-line statements and comments
      const statements = data
        .split(';')
        .map((s) => {
          // Remove single-line comments and trim whitespace
          return s
            .split('\n')
            .map((line) => line.replace(/--.*$/, '').trim())
            .filter((line) => line.length > 0)
            .join(' ')
            .trim();
        })
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        // Basic validation to prevent dangerous operations
        if (
          /DROP\s+DATABASE/i.test(statement) ||
          /CREATE\s+DATABASE/i.test(statement) ||
          /ALTER\s+DATABASE/i.test(statement)
        ) {
          throw new AppError('Import contains restricted operations', 403, 'FORBIDDEN');
        }

        try {
          const result = await client.query(statement);

          // Track INSERT operations
          if (statement.toUpperCase().startsWith('INSERT')) {
            totalRows += result.rowCount || 0;

            // Extract table name from INSERT statement
            const tableMatch = statement.match(/INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
            if (tableMatch && !importedTables.includes(tableMatch[1])) {
              importedTables.push(tableMatch[1]);
            }
          }

          // Track CREATE TABLE operations
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            // Extract table name from CREATE TABLE statement
            const tableMatch = statement.match(
              /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/i
            );
            if (tableMatch && !importedTables.includes(tableMatch[1])) {
              importedTables.push(tableMatch[1]);
            }
          }
        } catch (err: unknown) {
          console.error(`Failed to execute statement: ${statement.substring(0, 100)}...`, err);
          throw new AppError(
            `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            400,
            'INVALID_INPUT'
          );
        }
      }

      await client.query(`NOTIFY pgrst, 'reload schema';`);
      await client.query('COMMIT');
      await MetadataService.getInstance().updateDatabaseMetadata();

      return {
        success: true,
        message: 'SQL file imported successfully',
        filename,
        tables: importedTables,
        rowsImported: totalRows,
        fileSize,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
